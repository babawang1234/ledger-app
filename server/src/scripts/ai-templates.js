/**
 * AI 文生图模板生成脚本（通义万相）
 *
 * 目标：像花瓣网/站酷一样，用关键词生成「真实、贴题」的海报模板——
 *   关键词 → 万相文生图（真实海报底图）→ 下载到本地 → 套排版叠中文标题 → 渲染 PNG → 入库。
 *
 * 用法：
 *   node src/scripts/ai-templates.js                    # 默认关键词池
 *   node src/scripts/ai-templates.js "咖啡,环保,招聘"   # 自定义关键词
 *
 * 依赖：server/.env 配置 DASHSCOPE_API_KEY（阿里云百炼，免费额度）。
 * 未配置时脚本会退出并提示。
 */
import { config } from '../config/index.js'
import { db } from '../lib/db.js'
import { genId } from '../lib/util.js'
import { encodeBufferToDataUrl } from '../lib/renderer.js'
import { generateLayouts } from '../lib/layouts.js'
import { WanxAdapter } from '../adapters/wanx.js'

const DEFAULT_KEYWORDS = [
  '咖啡 咖啡馆 温暖 木质 手冲咖啡', '环保 绿色 地球 自然 森林',
  '招聘 职场 团队 办公 商务', '美食 餐厅 精致料理 摆盘',
  '科技 人工智能 数据 未来感', '母婴 亲子 温馨 宝宝',
  '健身 运动 活力 汗水', '旅游 风景 旅行 目的地',
  '金融 理财 财富 城市天际线', '节日 庆典 烟花 热闹',
]

// 每个关键词的万相生图 prompt（海报底图，不含文字）
function promptFor(keyword) {
  const kw = keyword.split(/\s+/)[0]
  return `${kw}主题海报背景图，高级设计感，构图留白充足便于叠加标题文字，色彩协调，专业平面设计风格，高清，无文字无字母无logo，竖版构图`
}

// 下载远程图（返回 base64 data URL，不落盘）
async function downloadImageAsDataUrl(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
  if (!res.ok) throw new Error(`下载图片失败 HTTP ${res.status}`)
  const bytes = Buffer.from(await res.arrayBuffer())
  if (bytes.length > 20 * 1024 * 1024) throw new Error('图片超出 20MB')
  return encodeBufferToDataUrl(bytes, 'image/png')
}

// 示例文案（比旧版更贴主题，减少「泛用话术」感）
function sampleContentFor(keyword, index) {
  const kw = keyword.split(/\s+/)[0]
  const pool = [
    { headline: `${kw}灵感`, subheadline: '把想法变成画面', body: '点击进入编辑，自由调整版式与文案', cta: '开始设计' },
    { headline: `${kw}主题海报`, subheadline: '一键套用，逐字可改', body: '专业版式 · 高清导出', cta: '使用模板' },
    { headline: `${kw}视觉方案`, subheadline: '留白与排版皆可调', body: '适配多尺寸 · 商用授权', cta: '立即套用' },
    { headline: `关于${kw}`, subheadline: '一个值得收藏的版式', body: '点击编辑，替换成你的文案', cta: '编辑模板' },
  ]
  const c = pool[index % pool.length]
  return { headline: c.headline, subheadline: c.subheadline, body: c.body, datetime: '', location: '', brand: '', cta: c.cta }
}

const CANVAS = { width: 1080, height: 1920 }

async function main() {
  const wanx = new WanxAdapter()
  if (!wanx.available) {
    console.error('[ai-templates] 未配置 DASHSCOPE_API_KEY，请在 server/.env 填写阿里云百炼 Key 后重试。')
    console.error('            获取方式：https://bailian.console.aliyun.com/  → API-KEY 管理')
    process.exit(1)
  }

  const args = process.argv.slice(2)
  const keywords = args.length
    ? args.join(' ').split(/[,，]/).map((s) => s.trim()).filter(Boolean)
    : DEFAULT_KEYWORDS

  console.log(`[ai-templates] 用万相生成 ${keywords.length} 个关键词的真实海报模板…`)
  let created = 0
  let failed = 0

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i]
    const kw = keyword.split(/\s+/)[0]
    const prompt = promptFor(keyword)
    try {
      // 1. 万相生图
      console.log(`[ai-templates] (${i + 1}/${keywords.length}) 生成「${kw}」底图…`)
      const { url } = await wanx.generateImage({ prompt, width: CANVAS.width, height: CANVAS.height })

      // 2. 下载为 data URL（不落盘）
      const imgDataUrl = await downloadImageAsDataUrl(url)

      // 3. 套排版叠标题
      const content = sampleContentFor(keyword, i)
      const layouts = generateLayouts({
        content,
        purpose: '通用海报',
        canvas: CANVAS,
        styleAnalysis: { palette: ['#d9ff72', '#f0a17c', '#25261f'] },
        stockAsset: { url: imgDataUrl, sourceName: 'AI 生成', photographer: '', templateStyle: undefined },
      })
      const layout = layouts[0]

      const name = `${kw} · ${content.headline}`
      const tags = JSON.stringify([kw, ...keyword.split(/\s+/), 'AI生成', '真实底图', '在线模板'])
      const description = `AI 文生图生成的主题「${kw}」海报模板，底图真实贴题，可进入工作台重新排版、逐字编辑。`

      db.prepare(
        `INSERT INTO templates (id, name, category, purpose, description, design_notes, sample_content,
          thumbnail_path, layers, canvas, background, tags, featured, badge)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        genId('tpl'), name, kw, '通用海报', description,
        JSON.stringify({ composition: layout.feature, palette: 'AI 自动配色', scenario: `${kw}海报` }),
        JSON.stringify(content), imgDataUrl,
        JSON.stringify(layout.layers), JSON.stringify(CANVAS), JSON.stringify(layout.background),
        tags, 0, 'AI生成',
      )

      created++
      console.log(`[ai-templates] ✓ ${name}`)
    } catch (e) {
      console.error(`[ai-templates] ✗ 「${kw}」失败：${e.message}`)
      failed++
    }
  }

  console.log(`[ai-templates] 完成：新增 ${created} 个模板，失败 ${failed} 个`)
  process.exit(0)
}

main()
