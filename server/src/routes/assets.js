import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import { asyncHandler } from '../lib/http.js'
import { config } from '../config/index.js'
import { searchAssetImages } from '../services/asset-search.js'

const router = Router()
router.use(authRequired)

// 图库可用状态：前端据此提前展示引导，而不是让用户搜索后报错
router.get('/status', asyncHandler(async (req, res) => {
  res.json({
    unsplash: !!config.providers.unsplash.accessKey,
    pexels: !!config.providers.pexels.apiKey,
    openverse: true,
    anyConfigured: !!(config.providers.unsplash.accessKey || config.providers.pexels.apiKey),
  })
}))

router.get('/search', asyncHandler(async (req, res) => {
  const query = String(req.query.q || '').trim().slice(0, 100)
  if (!query) return res.json({ photos: [] })
  const originalQuery = String(req.query.original || '').trim().slice(0, 160)
  const orientation = ['landscape', 'portrait', 'squarish'].includes(req.query.orientation) ? req.query.orientation : undefined
  const result = await searchAssetImages({ query, originalQuery, orientation, perPage: 18 })
  res.json(result)
}))

// Required by Unsplash API guidelines when a user selects a photo for use.
router.post('/select', asyncHandler(async (req, res) => {
  const id = String(req.body?.id || '')
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) return res.status(400).json({ error: 'INVALID_PHOTO_ID', message: '素材 ID 无效' })
  if (req.body?.provider === 'unsplash' && config.providers.unsplash.accessKey) {
    const response = await fetch(`https://api.unsplash.com/photos/${encodeURIComponent(id)}/download`, { headers: { Authorization: `Client-ID ${config.providers.unsplash.accessKey}`, 'Accept-Version': 'v1' }, signal: AbortSignal.timeout(6500) })
    if (!response.ok) throw new Error(`Unsplash 素材确认失败（HTTP ${response.status}）`)
  }
  res.json({ ok: true })
}))

export default router
