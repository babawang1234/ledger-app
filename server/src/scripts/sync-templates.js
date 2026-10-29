/**
 * 模板库自动扩充脚本（"爬虫"式 · 多样化版）
 *
 * 目标：像花瓣网一样，生成大量、多样化的模板底图，而非单一"全幅摄影"套路。
 *
 * 每个关键词会生成多种「底图类型 × 版式」组合：
 *   1. 摄影全幅   —— 图库照片铺满 + 压暗 + 底部标题
 *   2. 抽象艺术居中 —— 渐变背景 + 几何插画主视觉 + 居中标题
 *   3. 编辑画报   —— 渐变背景 + 插画焦点 + 左对齐编辑排版
 *   4. 上下分栏   —— 插画上栏 + 信息下栏
 *   5. 大标题冲击 —— 超大标题 + 插画主视觉
 *   6. 纯色几何   —— 纯渐变背景 + 色块 + 圆形装饰（无图片）
 *
 * 用法：
 *   node src/scripts/sync-templates.js                  # 默认关键词池
 *   node src/scripts/sync-templates.js "咖啡,旅游,宠物"  # 自定义关键词
 *
 * 依赖：server/.env 配置 PEXELS_API_KEY（免费）可获得语义匹配摄影图；
 *       未配置时摄影类回退 Picsum 随机图，其余类型不受影响。
 */
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { config } from '../config/index.js'
import { db } from '../lib/db.js'
import { genId } from '../lib/util.js'
import { renderPoster } from '../lib/renderer.js'
import { generateLayouts } from '../lib/layouts.js'
import { createArtworkDataUrl } from '../lib/artwork.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '../../public/templates')

const DEFAULT_KEYWORDS = [
  '环保 绿色 自然', '教育 学习 书本', '科技 人工智能 数据', '金融 理财 商务',
  '健康 运动 健身', '美食 餐厅 咖啡', '公益 慈善 爱心', '房产 建筑 家居',
  '汽车 驾驶 公路', '母婴 亲子 温暖', '促销 电商 购物', '招聘 办公 团队',
  '活动 演出 音乐', '旅游 风景 旅行', '宠物 萌宠 可爱', '节日 庆典 烟花',
  '时尚 穿搭 模特', '美妆 护肤 彩妆', '运动 球类 户外', '婚礼 浪漫 鲜花',
]

const CANVAS_VARIANTS = [
  { width: 1080, height: 1920 },
  { width: 1080, height: 1080 },
  { width: 1080, height: 1350 },
  { width: 1200, height: 628 },
]

// 7 种模板类型（索引对应）
const TEMPLATE_TYPES = ['photo', 'art-center', 'editorial', 'split', 'bold', 'gradient', 'photo']

// 更丰富的示例文案
function sampleContentFor(keyword, index) {
  const kw = keyword.trim()
  const pool = [
    { headline: `${kw}新体验`, subheadline: '发现不一样的精彩', body: '精选内容 · 限时特惠 · 品质之选', cta: '立即了解' },
    { headline: `遇见${kw}`, subheadline: '开启全新篇章', body: '专业 · 用心 · 值得信赖', cta: '马上体验' },
    { headline: `${kw}进行时`, subheadline: '此刻，正是好时机', body: '更多惊喜等你发现', cta: '立即参与' },
    { headline: `一起${kw}`, subheadline: '让生活更有温度', body: '诚意推荐 · 值得拥有', cta: '了解更多' },
    { headline: `${kw} · 焕新季`, subheadline: '全新升级，焕然一新', body: '只为更好的你', cta: '立即抢购' },
    { headline: `你好，${kw}`, subheadline: '美好，从此刻开始', body: '用心做好每一件事', cta: '立即探索' },
    { headline: `${kw}美学`, subheadline: '把喜欢变成日常', body: '细节之处见真章', cta: '了解更多' },
    { headline: `畅享${kw}`, subheadline: '品质生活新选择', body: '值得信赖的好物', cta: '立即体验' },
  ]
  const c = pool[index % pool.length]
  return {
    headline: c.headline,
    subheadline: c.subheadline,
    body: c.body,
    datetime: '',
    location: '',
    brand: 'WORKHORSE STUDIO',
    cta: c.cta,
  }
}

const STYLE_PALETTES = [
  ['#7c5cff', '#5b6cff', '#38d9f5'],
  ['#ff6b6b', '#ff9f43', '#feca57'],
  ['#0ca678', '#51cf66', '#94d82d'],
  ['#f06595', '#f783ac', '#ffd43b'],
  ['#1b6ca8', '#3bc9db', '#63e6be'],
  ['#ff9f43', '#ff6b6b', '#feca57'],
  ['#5b6cff', '#38d9f5', '#7c5cff'],
  ['#e17055', '#d63031', '#fdcb6e'],
  ['#6c5ce7', '#a29bfe', '#00cec9'],
  ['#2d3436', '#636e72', '#b2bec3'],
  ['#e84393', '#fd79a8', '#fab1a0'],
  ['#00b894', '#55efc4', '#81ecec'],
]

const ART_SCENES = ['stage', 'product', 'market', 'portrait', 'sculpture']

async function fetchPexels(keyword, perPage = 5) {
  if (!config.providers.pexels.apiKey) {
    throw new Error('未配置 PEXELS_API_KEY')
  }
  const url = new URL('https://api.pexels.com/v1/search')
  url.searchParams.set('query', keyword)
  url.searchParams.set('per_page', String(perPage))
  url.searchParams.set('size', 'large')
  const res = await fetch(url, { headers: { Authorization: config.providers.pexels.apiKey }, signal: AbortSignal.timeout(12000) })
  if (!res.ok) throw new Error(`Pexels 返回 HTTP ${res.status}`)
  const data = await res.json()
  return (data.photos || []).map((p) => ({
    id: String(p.id),
    provider: 'pexels',
    sourceName: 'Pexels',
    url: p.src?.large2x || p.src?.large,
    thumb: p.src?.medium,
    photographer: p.photographer || 'Pexels contributor',
    profileUrl: p.photographer_url || 'https://www.pexels.com',
    sourceUrl: p.url || 'https://www.pexels.com',
    alt: p.alt || keyword,
    license: 'Pexels License',
  })).filter((p) => p.url?.startsWith('https://'))
}

function fetchPicsumFallback(keyword, perPage = 5) {
  const seed = keyword.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return Array.from({ length: perPage }, (_, i) => ({
    id: `picsum-${seed}-${i}`,
    provider: 'picsum',
    sourceName: 'Picsum',
    url: `https://picsum.photos/seed/${seed + i}/1200/1600`,
    thumb: `https://picsum.photos/seed/${seed + i}/300/400`,
    photographer: 'Picsum 随机图库',
    profileUrl: 'https://picsum.photos',
    sourceUrl: 'https://picsum.photos',
    alt: keyword,
    license: 'Unsplash License (Picsum)',
  }))
}

// 生成单个模板的 layout + 特征标签
function buildLayout({ type, content, canvas, palette, stockAsset, typeIndex }) {
  const styleAnalysis = { palette }
  if (type === 'photo' && stockAsset) {
    // 摄影全幅：图库照片铺满
    const layouts = generateLayouts({
      content, purpose: '通用海报', canvas, styleAnalysis,
      stockAsset: { ...stockAsset, templateStyle: undefined }, // 走通用 photoLayout
    })
    return { layout: layouts[typeIndex % 4], badge: '摄影模板', kind: 'photo' }
  }
  // 抽象艺术主视觉（几何插画） + 各种版式，显式轮换 5 种场景
  const scene = ART_SCENES[typeIndex % ART_SCENES.length]
  const scenePurpose = ['品牌宣传', '活动宣传', '电商促销', '招聘启事', '社媒运营'][typeIndex % 5]
  const artSrc = createArtworkDataUrl({ palette, purpose: scenePurpose, content, variant: typeIndex, scene })
  const layouts = generateLayouts({
    content, purpose: scenePurpose, canvas, styleAnalysis,
    artwork: artSrc,
  })
  return { layout: layouts[typeIndex % 4], badge: '设计模板', kind: 'art' }
}

async function main() {
  const args = process.argv.slice(2)
  const keywords = args.length
    ? args.join(' ').split(/[,，]/).map((s) => s.trim()).filter(Boolean)
    : DEFAULT_KEYWORDS

  console.log(`[sync] 目标关键词 ${keywords.length} 个，多样化生成模板（摄影/艺术/渐变等 7 类）…`)
  fs.mkdirSync(OUT_DIR, { recursive: true })

  let created = 0
  let failed = 0
  let globalIndex = 0

  for (const keyword of keywords) {
    // 抓摄影底图（供「摄影全幅」类型用）
    let photos = []
    try {
      photos = await fetchPexels(keyword, 3)
    } catch (e) {
      console.warn(`[sync] 「${keyword}」Pexels 不可用（${e.message}），摄影类回退 Picsum`)
      photos = fetchPicsumFallback(keyword, 3)
    }

    // 每个关键词生成 6 个多样化模板
    for (let i = 0; i < 6; i++) {
      const type = TEMPLATE_TYPES[i % TEMPLATE_TYPES.length]
      const primaryKw = keyword.split(/\s+/)[0]
      const canvas = CANVAS_VARIANTS[globalIndex % CANVAS_VARIANTS.length]
      const content = sampleContentFor(primaryKw, globalIndex)
      const palette = STYLE_PALETTES[globalIndex % STYLE_PALETTES.length]
      const stockAsset = photos[i % photos.length] || null

      try {
        const { layout, badge, kind } = buildLayout({
          type, content, canvas, palette, stockAsset, typeIndex: globalIndex,
        })

        const slugBase = primaryKw.replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
        const filename = `tpl-sync-${slugBase}-${type}-${globalIndex}.png`
        const buf = await renderPoster({
          width: canvas.width, height: canvas.height,
          background: layout.background, layers: layout.layers,
        })
        fs.writeFileSync(path.join(OUT_DIR, filename), buf)

        const name = `${primaryKw} · ${content.headline}`
        const tags = JSON.stringify([primaryKw, ...keyword.split(/\s+/), badge, '在线模板', kind])
        const description = badge === '摄影模板'
          ? `由图库免费底图生成的主题「${primaryKw}」模板，可进入工作台重新排版。`
          : `原创设计版式模板（${layout.feature}），主题「${primaryKw}」，可进入工作台编辑。`

        db.prepare(
          `INSERT INTO templates (id, name, category, purpose, description, design_notes, sample_content,
            thumbnail_path, layers, canvas, background, tags, featured, badge)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          genId('tpl'),
          name,
          primaryKw,
          '通用海报',
          description,
          JSON.stringify({ composition: layout.feature, palette: palette.join('、'), scenario: `${primaryKw}海报` }),
          JSON.stringify(content),
          `/templates/${filename}`,
          JSON.stringify(layout.layers),
          JSON.stringify(canvas),
          JSON.stringify(layout.background),
          tags,
          0,
          badge,
        )

        created++
        globalIndex++
        console.log(`[sync] ${name}（${badge}）→ ${filename}`)
      } catch (e) {
        console.error(`[sync] 渲染失败（${keyword}#${i}）：${e.message}`)
        failed++
      }

      await new Promise((r) => setTimeout(r, 120))
    }
  }

  console.log(`[sync] 完成：新增 ${created} 个模板，失败 ${failed} 个`)
  process.exit(0)
}

main()
