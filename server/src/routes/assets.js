import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import { asyncHandler } from '../lib/http.js'
import { config } from '../config/index.js'
import { searchAssetImages } from '../services/asset-search.js'
import { generateDesignBackdrops } from '../lib/design-backdrop.js'
import { encodeBufferToDataUrl } from '../lib/renderer.js'

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
  const limit = Math.min(48, Math.max(12, Number(req.query.limit) || 36))
  const result = await searchAssetImages({ query, originalQuery, orientation, perPage: limit })

  // 关键兜底：图库 + 本地池都无命中时（aiFallback），用真实 AI 生图按关键词生成贴题图，
  // 解决"换任意关键词搜不出、图文不符"的根本问题（AI 能理解"水厂"等具体实体词）。
  let aiGeneratedPhotos = []
  if (result.aiFallback && result.photos.length === 0) {
    try {
      const { PollinationsAdapter, deriveVariants } = await import('../adapters/pollinations.js')
      const { keywordToImagePrompt } = await import('../lib/image-prompt.js')
      const pollinations = new PollinationsAdapter()
      if (pollinations.available) {
        const prompt = keywordToImagePrompt(query)
        if (prompt) {
          const { buffer } = await pollinations.generateImage({ prompt, width: 1080, height: 1440 })
          // 生成 6 张差异明显的变体，让用户有更多选择（而非只有 1~3 张）
          const variants = await deriveVariants(buffer, 6)
          aiGeneratedPhotos = variants.map((v, i) => {
            // 图片以 data URL 直接返回，不落盘，避免占用本地磁盘
            const dataUrl = encodeBufferToDataUrl(v.buffer, 'image/jpeg')
            return {
              id: `ai-search-${Date.now()}-${i}`,
              provider: 'ai',
              sourceName: 'AI 生成',
              description: `${query} · AI 生成贴题图 ${i + 1}`,
              url: dataUrl,
              thumb: dataUrl,
              photographer: 'AI 生成',
              license: 'AI 生成 · 可商用',
            }
          })
        }
      }
    } catch (e) {
      console.warn('[assets] AI 兜底生图失败：', e.message)
    }
  }

  // 生成"设计底图"（虚拟背景）：摄影图之外，再给用户提供设计感的抽象背景
  let designBackdrops = []
  try {
    const count = 6
    const backdrops = generateDesignBackdrops(query, { count })
    designBackdrops = backdrops.map((b) => {
      const dataUrl = encodeBufferToDataUrl(b.buffer, 'image/png')
      return {
        id: b.id,
        provider: 'design',
        sourceName: '设计底图',
        description: b.description,
        url: dataUrl,
        thumb: dataUrl,
        photographer: '幻象工坊 · 设计库',
        license: '设计底图 · 可商用',
        kind: 'design',
        width: b.width,
        height: b.height,
      }
    })
  } catch (e) {
    console.warn('[assets] 设计底图生成失败：', e.message)
  }

  const photos = [...result.photos, ...aiGeneratedPhotos]
  res.json({
    ...result,
    photos,
    aiFallback: !!aiGeneratedPhotos.length,
    message: photos.length ? '' : result.message,
    designBackdrops,
  })
}))

// 单独获取"设计底图"（虚拟背景）——供「设计底图」Tab 使用
router.get('/design-backdrops', asyncHandler(async (req, res) => {
  const query = String(req.query.q || '').trim().slice(0, 100)
  if (!query) return res.json({ backdrops: [] })
  const count = Math.min(12, Math.max(4, Number(req.query.count) || 8))
  const backdrops = generateDesignBackdrops(query, { count })
  const items = backdrops.map((b) => {
    const dataUrl = encodeBufferToDataUrl(b.buffer, 'image/png')
    return {
      id: b.id,
      provider: 'design',
      sourceName: '设计底图',
      description: b.description,
      url: dataUrl,
      thumb: dataUrl,
      photographer: '幻象工坊 · 设计库',
      license: '设计底图 · 可商用',
      kind: 'design',
      width: b.width,
      height: b.height,
    }
  })
  res.json({ backdrops: items })
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
