import { Router } from 'express'
import { asyncHandler } from '../lib/http.js'
import { db } from '../lib/db.js'

const router = Router()

function serialize(t) {
  const layers = JSON.parse(t.layers || '[]')
  const photo = layers.find((layer) => layer.type === 'image' && /^https:\/\/images\.unsplash\.com\//.test(layer.src || ''))
  const credit = layers.find((layer) => layer.type === 'text' && layer.photographer)
  return {
    ...t,
    tags: JSON.parse(t.tags || '[]'),
    canvas: JSON.parse(t.canvas || '{}'),
    designNotes: JSON.parse(t.design_notes || '{}'),
    sampleContent: JSON.parse(t.sample_content || '{}'),
    featured: !!t.featured,
    stockAsset: photo && credit ? {
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
    } : null,
  }
}

// 灵感库/模板列表（公开），支持分类筛选与搜索
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { category, q } = req.query
    let sql = 'SELECT * FROM templates'
    const conds = []
    const args = []
    if (category && category !== '全部') {
      conds.push('category = ?')
      args.push(category)
    }
    if (q) {
      conds.push('(name LIKE ? OR description LIKE ? OR tags LIKE ?)')
      const like = `%${q}%`
      args.push(like, like, like)
    }
    if (conds.length) sql += ' WHERE ' + conds.join(' AND ')
    sql += ' ORDER BY featured DESC, created_at DESC'
    const rows = db.prepare(sql).all(...args)
    res.json({ templates: rows.map(serialize) })
  })
)

// 关键词发现：花瓣网式检索——命中模板优先，不足时用推荐补齐；seed 控制换一换
router.get(
  '/discover',
  asyncHandler(async (req, res) => {
    const raw = String(req.query.q || '').trim().slice(0, 120)
    const seed = Number(req.query.seed) || 0
    const exclude = String(req.query.exclude || '').split(',').filter(Boolean).slice(0, 40)
    const limit = Math.min(Number(req.query.limit) || 12, 24)

    // 简易可复现随机（mulberry32）
    const rand = (() => {
      let a = seed * 0x9e3779b9 + 0x6d2b79f5
      return () => {
        a |= 0; a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
    })()

    const all = db.prepare('SELECT * FROM templates').all().filter((t) => !exclude.includes(t.id))
    const tokens = raw
      .replace(/[，,。.!！?？；;\n]/gu, ' ')
      .split(/\s+/)
      .flatMap((token) => (token.length > 2 ? [token, token.slice(0, 2)] : [token]))
      .filter((token) => token.length >= 2)

    const scored = all.map((t) => {
      const haystack = [t.name, t.description, t.category, t.purpose, t.style, t.tags, t.design_notes]
        .filter(Boolean).join(' ')
      let score = 0
      for (const token of new Set(tokens)) {
        if (haystack.includes(token)) score += token.length >= 3 ? 3 : 2
        if ((t.name || '').includes(token)) score += 2
        if ((t.tags || '').includes(token)) score += 1
      }
      if (!raw) score = 0
      return { t, score }
    })

    const matched = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((s) => s.t)
    const rest = scored.filter((s) => s.score <= 0).map((s) => s.t)
    rest.sort(() => rand() - 0.5)

    const picked = [...matched, ...rest].slice(0, limit)
    res.json({
      templates: picked.map(serialize),
      matched: matched.length,
      query: raw,
      fallback: matched.length < limit,
    })
  })
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const t = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id)
    if (!t) return res.status(404).json({ error: 'NOT_FOUND', message: '模板不存在' })
    res.json({
      template: {
        ...serialize(t),
        layers: JSON.parse(t.layers || '[]'),
        background: JSON.parse(t.background || '{}'),
      },
    })
  })
)

export default router
