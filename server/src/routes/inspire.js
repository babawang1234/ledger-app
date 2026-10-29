import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import { asyncHandler } from '../lib/http.js'
import { db } from '../lib/db.js'
import { draftCopy, parseBrief, scoreTemplates } from '../skills/poster/interpret.js'
import { autoRoute, invoke } from '../adapters/index.js'
import { searchLocalPool, toPhoto } from '../lib/local-image-pool.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const router = Router()
router.use(authRequired)

const PURPOSES = new Set(['活动宣传', '产品推广', '电商促销', '社媒运营', '品牌宣传', '招聘启事', '节日祝福'])
const RATIOS = new Set(['3:4', '9:16', '1:1', '16:9'])

function parseModelJson(content) {
  if (content && typeof content === 'object') return content
  const text = String(content || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try { return JSON.parse(text) } catch { return null }
}

async function interpretWithTextModel(description) {
  const model = autoRoute('text')
  if (!model || model.is_mock) return null
  try {
    const result = await invoke(model, 'text', {
      model: model.model_id,
      system: [
        '你是中文商业海报创意总监。先理解用户的真实商品、活动或场景，再给出高度贴合的创意 brief。',
        '严禁编造日期、地点、折扣、产品功效、品牌名、数字和事实；没有提供就留空。',
        '标题与短文案需要有创意、自然、简短且符合具体行业，禁止万能模板话术。',
        '图像检索词只描述用户明确提到的主体、动作、物体和视觉风格。除非用户明确提出，不要加入国家、城市、地标、旗帜、民族服饰等地域或文化符号；优先中性、无文字的摄影背景。',
        '只返回 JSON，不要 markdown。字段：purpose, ratioHint, styleKey, subject, keywords, imageSearchQuery, understanding, content。',
        'purpose 必须是：活动宣传、产品推广、电商促销、社媒运营、品牌宣传、招聘启事、节日祝福。ratioHint 只能是 3:4、9:16、1:1、16:9 或 null。',
        'content 必须包含 headline, subheadline, body, datetime, location, brand, cta，所有值为字符串；headline 必须有内容，其余未知信息留空。',
        'imageSearchQuery 请给 3 到 6 个英文词，描述应检索到的实景摄影主体与美术方向，不要搜索海报或设计稿。',
      ].join('\n'),
      prompt: `用户需求：\n${description}\n\n返回严格 JSON。`,
    })
    return parseModelJson(result.content)
  } catch (error) {
    console.warn(`[inspire] 文本模型不可用，切换本地创意解析：${error.message}`)
    return null
  }
}

function stockAssetFromTemplate(template) {
  const layers = JSON.parse(template.layers || '[]')
  const photo = layers.find((layer) => layer.type === 'image' && /^https:\/\/images\.unsplash\.com\//.test(layer.src || ''))
  const credit = layers.find((layer) => layer.type === 'text' && layer.photographer)
  if (!photo || !credit) return null
  return {
    id: photo.src.match(/photo-([a-zA-Z0-9-]+)/)?.[0] || 'curated-template-photo',
    provider: 'unsplash',
    sourceName: 'Unsplash',
    url: photo.src,
    photographer: credit.photographer,
    profileUrl: credit.sourceUrl,
    unsplashUrl: credit.unsplashUrl,
    sourceUrl: credit.unsplashUrl,
    templateStyle: photo.templateStyle,
    curated: true,
    license: 'Unsplash License',
  }
}

/**
 * 自然语言需求解析 + 模板检索。
 * 流程：parseBrief（确定性解析，mock）→ 检索灵感库模板打分 → 返回理解结果与推荐模板。
 * 未接入真实语言模型时，understanding 全部标注为演示解析，不伪装成真实 AI 思考。
 */
router.post(
  '/interpret',
  asyncHandler(async (req, res) => {
    const description = String(req.body?.description || '').trim().slice(0, 500)
    if (!description) {
      return res.status(400).json({ error: 'EMPTY_DESCRIPTION', message: '请先描述你想做的海报' })
    }

    const fallback = parseBrief(description)
    const ai = await interpretWithTextModel(description)
    const exactTopicOnly = fallback.concepts[0]?.key === 'teachers-day'
    const brief = ai ? {
      ...fallback,
      purpose: exactTopicOnly ? '节日祝福' : PURPOSES.has(ai.purpose) ? ai.purpose : fallback.purpose,
      ratioHint: RATIOS.has(ai.ratioHint) ? ai.ratioHint : fallback.ratioHint,
      styleKey: typeof ai.styleKey === 'string' ? ai.styleKey : fallback.styleKey,
      subject: typeof ai.subject === 'string' ? ai.subject.slice(0, 80) : fallback.subject,
      keywords: Array.isArray(ai.keywords) ? ai.keywords.map(String).map((word) => word.slice(0, 32)).slice(0, 10) : fallback.keywords,
      understanding: Array.isArray(ai.understanding) ? ai.understanding.map(String).slice(0, 4) : fallback.understanding,
      mock: false,
    } : fallback
    const content = !exactTopicOnly && ai?.content && typeof ai.content === 'object' ? {
      headline: String(ai.content.headline || '').slice(0, 24) || fallback.subject || '灵感即刻发生',
      subheadline: String(ai.content.subheadline || '').slice(0, 48),
      body: String(ai.content.body || '').slice(0, 100),
      datetime: String(ai.content.datetime || '').slice(0, 40),
      location: String(ai.content.location || '').slice(0, 40),
      brand: String(ai.content.brand || '').slice(0, 40),
      cta: String(ai.content.cta || '了解详情').slice(0, 16),
    } : null
    const draft = content?.headline ? content : draftCopy(description, brief.purpose, fallback.concepts)

    // 模板检索（本地灵感库）
    const rows = db
      .prepare(
        `SELECT id, name, category, purpose, description, thumbnail_path, tags, canvas, badge, design_notes, sample_content
         FROM templates`
      )
      .all()
    const templates = rows.map((t) => ({
      ...t,
      tags: JSON.parse(t.tags || '[]'),
      canvas: JSON.parse(t.canvas || '{}'),
      designNotes: t.design_notes ? JSON.parse(t.design_notes) : null,
      sampleContent: t.sample_content ? JSON.parse(t.sample_content) : null,
      stockAsset: stockAssetFromTemplate(t),
    }))
    const scored = scoreTemplates(templates, brief)
    const ranked = scored.filter((r) => r.score >= 4 && r.template.stockAsset).slice(0, 4)
    const recommendations = ranked.map(({ template, matched }) => ({
      id: template.id,
      name: template.name,
      category: template.category,
      purpose: template.purpose,
      badge: template.badge,
      thumbnail: template.thumbnail_path,
      tags: template.tags,
      canvas: template.canvas,
      designNotes: template.designNotes,
      sampleContent: template.sampleContent,
      stockAsset: template.stockAsset,
      matchedWords: matched,
      matchReason: matched.length
        ? `与「${matched.join('、')}」相关`
        : `符合「${template.purpose}」用途`,
    }))
    res.json({
      brief: {
        ...brief,
        mock: !ai,
        mockNote: ai ? '' : '本地语义规则解析；配置 DeepSeek/OpenAI 文本模型后会使用真实模型理解需求。',
      },
      content: content || draft,
      // Specific subject terms must win over broad intent concepts such as "new product".
      // When no text model is configured, preserve the user's concrete subject instead of
      // falling back to generic stock phrases like "premium product still life".
      imageSearchQuery: String(exactTopicOnly
        ? fallback.concepts[0].query
        : ai?.imageSearchQuery || [fallback.subject, ...(fallback.keywords || [])].filter(Boolean).join(' ') || description).slice(0, 160),
      templates: recommendations,
    })
  })
)

/**
 * AI 生成海报底图（双链路之一）
 * 输入关键词 → 万相文生图 → 下载到本地 → 返回可选的底图 URL 列表。
 * 未配置 DASHSCOPE_API_KEY 时返回明确提示（前端据此展示引导）。
 */
router.post(
  '/ai-background',
  asyncHandler(async (req, res) => {
    const keyword = String(req.body?.keyword || '').trim().slice(0, 100)
    const count = Math.min(3, Math.max(1, Number(req.body?.count) || 3))
    if (!keyword) return res.status(400).json({ error: 'EMPTY_KEYWORD', message: '请提供关键词' })

    const { WanxAdapter } = await import('../adapters/wanx.js')
    const wanx = new WanxAdapter()
    if (!wanx.available) {
      // 无万相 Key 时降级为本地图库池匹配，返回真实贴图底图（而非报错）
      const localImgs = searchLocalPool(keyword, { limit: count }).map(toPhoto)
      return res.json({
        images: localImgs,
        fallback: 'local',
        message: localImgs.length ? '' : '未配置 AI 图像生成 Key，且本地图库暂无匹配，请换更具体的关键词。',
      })
    }

    const aiImgDir = path.resolve(__dirname, '../../public/ai-images')
    fs.mkdirSync(aiImgDir, { recursive: true })

    const images = []
    const prompts = [
      `${keyword}主题海报背景图，高级设计感，构图留白充足便于叠加标题，色彩协调，专业平面设计，高清，无文字无字母无logo，竖版构图`,
      `${keyword}创意视觉背景，抽象艺术与主题融合，大气留白，现代简约风，高清，无文字无水印，竖版`,
      `${keyword}氛围场景背景，质感光影，主题突出，适合海报留白排版，专业设计感，高清，无文字，竖版`,
    ]

    for (let i = 0; i < count; i++) {
      try {
        const prompt = prompts[i % prompts.length]
        const { url } = await wanx.generateImage({ prompt, width: 1080, height: 1920 })
        // 下载到本地，避免万相 24h URL 过期
        const filename = `ai-${Date.now()}-${i}.png`
        const res2 = await fetch(url, { signal: AbortSignal.timeout(30000) })
        if (!res2.ok) throw new Error(`下载 AI 图失败 HTTP ${res2.status}`)
        const bytes = Buffer.from(await res2.arrayBuffer())
        fs.writeFileSync(path.join(aiImgDir, filename), bytes)
        images.push({
          id: `ai-${Date.now()}-${i}`,
          provider: 'ai',
          sourceName: 'AI 生成',
          url: `/ai-images/${filename}`,
          thumb: `/ai-images/${filename}`,
          description: `${keyword} · AI 生成底图 ${i + 1}`,
          photographer: 'AI 生成',
          license: 'AI 生成 · 可商用',
        })
      } catch (e) {
        console.warn(`[inspire] AI 生成第 ${i + 1} 张失败：${e.message}`)
      }
    }

    res.json({
      images,
      message: images.length ? '' : 'AI 生成暂时失败，可稍后重试或切换「图库检索」链路。',
    })
  })
)

export default router
