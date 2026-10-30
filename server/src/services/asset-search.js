import { config } from '../config/index.js'
import { searchLocalPool, toPhoto } from '../lib/local-image-pool.js'

const CACHE_TTL = 5 * 60 * 1000
const cache = new Map()

function cleanQuery(value) {
  return String(value || '')
    .replace(/^(?:我想|我想要|帮我|请帮我|请|给我|帮忙)?(?:做|制作|设计|生成)?(?:一张|一个|一款|一组|一幅)?/u, '')
    // Remove asset-type labels but preserve the user's visual details that follow them.
    .replace(/(?:海报|宣传图|主视觉|封面|配图|底图|背景素材)/gu, ' ')
    .replace(/[，,。.!！?？；;\n]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 120)
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(6500),
    redirect: 'error',
  })
  if (!response.ok) {
    const error = new Error(`素材源返回 HTTP ${response.status}`)
    error.status = response.status
    throw error
  }
  return response.json()
}

function normalizePhoto(photo) {
  return {
    id: photo.id,
    provider: 'unsplash',
    sourceName: 'Unsplash',
    description: photo.alt_description || photo.description || 'Unsplash 摄影素材',
    url: photo.urls?.regular,
    thumb: photo.urls?.small,
    photographer: photo.user?.name || 'Unsplash contributor',
    profileUrl: `${photo.user?.links?.html || 'https://unsplash.com'}?utm_source=poster_studio&utm_medium=referral`,
    sourceUrl: `${photo.links?.html || 'https://unsplash.com'}?utm_source=poster_studio&utm_medium=referral`,
    unsplashUrl: `${photo.links?.html || 'https://unsplash.com'}?utm_source=poster_studio&utm_medium=referral`,
    license: 'Unsplash License',
  }
}

function normalizePexels(photo) {
  return {
    id: String(photo.id),
    provider: 'pexels',
    sourceName: 'Pexels',
    description: photo.alt || 'Pexels 摄影素材',
    url: photo.src?.large2x || photo.src?.large,
    thumb: photo.src?.medium || photo.src?.small,
    photographer: photo.photographer || 'Pexels contributor',
    profileUrl: photo.photographer_url,
    sourceUrl: photo.url,
    license: 'Pexels License',
  }
}

function normalizeOpenverse(image) {
  const pageUrl = image.foreign_landing_url || image.detail_url || image.url
  return {
    id: String(image.id),
    provider: 'openverse',
    sourceName: image.source || 'Openverse',
    description: [image.title, image.description].filter(Boolean).join(' · ') || '开放许可摄影素材',
    url: image.url,
    thumb: image.thumbnail || image.url,
    photographer: image.creator || '作者未署名',
    profileUrl: image.creator_url || pageUrl,
    sourceUrl: pageUrl,
    license: image.license ? `${image.license.toUpperCase()}${image.license_version ? ` ${image.license_version}` : ''}` : '开放许可，请查看来源页',
    licenseUrl: image.license_url,
  }
}

async function searchUnsplash(query, orientation, perPage) {
  if (!config.providers.unsplash.accessKey) return []
  const url = new URL('https://api.unsplash.com/search/photos')
  url.searchParams.set('query', query)
  url.searchParams.set('per_page', String(perPage))
  url.searchParams.set('content_filter', 'high')
  if (orientation) url.searchParams.set('orientation', orientation)
  const data = await requestJson(url, { headers: { Authorization: `Client-ID ${config.providers.unsplash.accessKey}`, 'Accept-Version': 'v1' } })
  return (data.results || []).map(normalizePhoto).filter((photo) => photo.url && photo.thumb)
}

async function searchPexels(query, orientation, perPage) {
  if (!config.providers.pexels.apiKey) return []
  const url = new URL('https://api.pexels.com/v1/search')
  url.searchParams.set('query', query)
  url.searchParams.set('per_page', String(perPage))
  if (orientation) url.searchParams.set('orientation', orientation)
  const data = await requestJson(url, { headers: { Authorization: config.providers.pexels.apiKey } })
  return (data.photos || []).map(normalizePexels).filter((photo) => photo.url && photo.thumb)
}

async function searchOpenverse(query, orientation, perPage) {
  if (!query) return []
  const url = new URL('https://api.openverse.org/v1/images/')
  url.searchParams.set('q', query)
  url.searchParams.set('page_size', String(perPage))
  // Commercially usable licenses that allow adapting the source image.
  url.searchParams.set('license', 'cc0,pdm,by')
  url.searchParams.set('category', 'photograph')
  url.searchParams.set('size', 'large')
  url.searchParams.set('filter_dead', 'true')
  if (orientation === 'landscape') url.searchParams.set('aspect_ratio', 'wide')
  if (orientation === 'portrait') url.searchParams.set('aspect_ratio', 'tall')
  const data = await requestJson(url, { headers: { Accept: 'application/json' } })
  return (data.results || []).map(normalizeOpenverse).filter((photo) => photo.url && photo.thumb && photo.sourceUrl)
}

export async function searchAssetImages({ query, originalQuery, orientation, perPage = 18 }) {
  const primary = cleanQuery(query)
  const original = cleanQuery(originalQuery)
  const queries = [...new Set([primary, original].filter(Boolean))].slice(0, 2)
  if (!queries.length) return { photos: [], providers: [], message: '输入主体关键词后即可搜索背景素材。' }

  const cacheKey = JSON.stringify({ queries, orientation, perPage, hasUnsplash: !!config.providers.unsplash.accessKey, hasPexels: !!config.providers.pexels.apiKey })
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.value

  const jobs = []
  for (const searchQuery of queries) {
    jobs.push({ provider: 'openverse', promise: searchOpenverse(searchQuery, orientation, Math.max(6, Math.ceil(perPage / queries.length))) })
    if (config.providers.unsplash.accessKey) jobs.push({ provider: 'unsplash', promise: searchUnsplash(searchQuery, orientation, Math.max(6, Math.ceil(perPage / queries.length))) })
    if (config.providers.pexels.apiKey) jobs.push({ provider: 'pexels', promise: searchPexels(searchQuery, orientation, Math.max(6, Math.ceil(perPage / queries.length))) })
  }
  const settled = await Promise.allSettled(jobs.map((job) => job.promise))
  const photos = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : [])
    .filter((photo) => photo.url?.startsWith('https://') && photo.thumb?.startsWith('https://'))
  const providers = [...new Set(photos.map((photo) => photo.provider))]
  const failures = settled.flatMap((result, index) => result.status === 'rejected' ? [{
    provider: jobs[index].provider,
    status: Number(result.reason?.status) || null,
    code: result.reason?.cause?.code || result.reason?.name || 'ERROR',
  }] : [])
  const unavailable = [...new Set(failures.map((failure) => failure.provider))]
  const authFailures = failures.filter((failure) => failure.status === 401 || failure.status === 403)
  const networkFailures = failures.filter((failure) => !failure.status)
  const hasPexelsKey = !!config.providers.pexels.apiKey
  const hasUnsplashKey = !!config.providers.unsplash.accessKey
  const keyMissing = !hasUnsplashKey && !hasPexelsKey

  // 本地图库池兜底：当外部图库（无 Key 或网络不通）返回空时，用本地预置的真实图片补充
  let localPhotos = []
  let localFallback = false
  let aiFallback = false
  if (photos.length === 0) {
    localPhotos = searchLocalPool(queries[0], { limit: perPage }).map(toPhoto)
    if (localPhotos.length) {
      localFallback = true
      localPhotos.forEach((p) => providers.push(p.provider))
    } else {
      // 本地池也无命中：标记需要上层用 AI 生图兜底（理解任意具体词，如"水厂"）
      aiFallback = true
    }
  }
  const merged = [...photos, ...localPhotos]
  const unique = [...new Map(merged.map((photo) => [`${photo.provider}:${photo.id}`, photo])).values()].slice(0, perPage)
  const finalProviders = [...new Set(unique.map((photo) => photo.provider))]

  const value = {
    photos: unique,
    providers: finalProviders,
    unavailable,
    localFallback,
    aiFallback,
    providerStatus: {
      openverse: failures.some((failure) => failure.provider === 'openverse') ? 'unreachable' : 'available',
      pexels: !hasPexelsKey ? 'key_required' : authFailures.some((failure) => failure.provider === 'pexels') ? 'invalid_key' : unavailable.includes('pexels') ? 'unreachable' : 'available',
      unsplash: !hasUnsplashKey ? 'key_required' : authFailures.some((failure) => failure.provider === 'unsplash') ? 'invalid_key' : unavailable.includes('unsplash') ? 'unreachable' : 'available',
      local: localFallback ? 'available' : 'idle',
    },
    keyMissing,
    message: unique.length ? '' : authFailures.length
      ? `${authFailures.map((failure) => `${failure.provider} 返回 HTTP ${failure.status}，请检查图库 API Key`).join('；')}。`
      : keyMissing && networkFailures.some((failure) => failure.provider === 'openverse')
        ? 'Openverse 在当前服务端连接超时，且本地图库暂无「该主题」的图片。配置 Pexels / Unsplash Key 可获得任意关键词的实时搜索覆盖。'
        : networkFailures.length
          ? `图库服务连接失败：${[...new Set(networkFailures.map((failure) => failure.provider))].join('、')}。请检查服务端网络或代理设置后重试。`
          : keyMissing
            ? '本地图库暂无「该主题」的图片。配置 Pexels / Unsplash API Key 后可按任意关键词实时搜索摄影素材。'
            : '图库已连接，但没有返回相关图片；可改用更具体的主体词搜索。',
  }
  cache.set(cacheKey, { at: Date.now(), value })
  return value
}
