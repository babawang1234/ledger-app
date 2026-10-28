import { config } from '../config/index.js'

const CACHE_TTL = 5 * 60 * 1000
const cache = new Map()

function cleanQuery(value) {
  return String(value || '')
    .replace(/^(?:我想|我想要|帮我|请帮我|请|给我|帮忙)?(?:做|制作|设计|生成)?(?:一张|一个|一款|一组|一幅)?/u, '')
    .replace(/(?:海报|宣传图|主视觉|封面|配图|底图|背景素材).*/u, '')
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
  if (!response.ok) throw new Error(`素材源返回 HTTP ${response.status}`)
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
  const unique = [...new Map(photos.map((photo) => [`${photo.provider}:${photo.id}`, photo])).values()].slice(0, perPage)
  const providers = [...new Set(unique.map((photo) => photo.provider))]
  const unavailable = [...new Set(settled.flatMap((result, index) => result.status === 'rejected' ? [jobs[index].provider] : []))]
  const value = {
    photos: unique,
    providers,
    unavailable,
    keyMissing: !config.providers.unsplash.accessKey && !config.providers.pexels.apiKey,
    message: unique.length ? '' : unavailable.includes('openverse')
      ? '开放图库暂不可连接，请检查服务端网络；也可配置 Pexels / Unsplash API Key 扩大图库覆盖。'
      : '当前图库没有返回相关结果；可缩短关键词，或配置 Pexels / Unsplash API Key 扩大图库覆盖。',
  }
  cache.set(cacheKey, { at: Date.now(), value })
  return value
}
