import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import { asyncHandler } from '../lib/http.js'
import { db } from '../lib/db.js'
import { draftCopy, parseBrief, scoreTemplates } from '../skills/poster/interpret.js'
import { autoRoute, invoke } from '../adapters/index.js'

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
      imageSearchQuery: String(exactTopicOnly ? fallback.concepts[0].query : ai?.imageSearchQuery || fallback.concepts?.[0]?.query || fallback.subject || description).slice(0, 120),
      templates: recommendations,
    })
  })
)

export default router
