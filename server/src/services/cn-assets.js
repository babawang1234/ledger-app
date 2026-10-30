/**
 * 中文素材实时抓取服务 —— 搜索时直接从堆糖（duitang）/ 站酷（zcool）抓取图片 URL，
 * 不下载到本地、不占磁盘，直接返回 CDN 图片链接给前端展示。
 *
 * 用于解决「都是外国图」问题：这些是真正的中国风/中文场景素材。
 * 说明：图片 URL 直接引用源站 CDN（热链），前端 <img> 加载即可显示。
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

/** 从堆糖搜索页抓取图片 URL（实时，不落盘） */
async function crawlDuitang(kw) {
  const url = `https://www.duitang.com/search/?kw=${encodeURIComponent(kw)}&type=feed`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': UA } })
  if (!res.ok) return []
  const text = await res.text()
  const urls = [...text.matchAll(/https?:\/\/[^\s"'\\)]+?\.(?:jpg|jpeg|png|webp)[^\s"'\\)]*/gi)]
    .map((m) => m[0])
  return [...new Set(urls)].filter((u) => u.includes('dtstatic') || u.includes('duitang'))
}

/** 从站酷搜索页抓取图片 URL（实时，不落盘） */
async function crawlZcool(kw) {
  const url = `https://www.zcool.com.cn/search/content?word=${encodeURIComponent(kw)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': UA } })
  if (!res.ok) return []
  const text = await res.text()
  const urls = [...text.matchAll(/https?:\/\/[^\s"'\\)]+?\.(?:jpg|jpeg|png|webp)[^\s"'\\)]*/gi)]
    .map((m) => m[0])
  return [...new Set(urls)].filter((u) => u.includes('zcool') || u.includes('img.zcool'))
}

/**
 * 搜索中文素材，返回标准化 photo 列表（url 为源站 CDN 直链，前端直接展示）。
 * @param {string} query 关键词
 * @param {number} limit 返回数量
 */
export async function searchCnAssets(query, { limit = 24 } = {}) {
  const kw = String(query || '').trim()
  if (!kw) return []

  const results = []
  try { results.push(...await crawlDuitang(kw)) } catch (e) { console.warn('[cn-assets] 堆糖失败：', e.message) }
  try { results.push(...await crawlZcool(kw)) } catch (e) { console.warn('[cn-assets] 站酷失败：', e.message) }

  const unique = [...new Set(results)]
    .filter((u) => /\.(jpg|jpeg|png|webp)/i.test(u))
    .slice(0, limit)

  return unique.map((url, i) => ({
    id: `cn-${Date.now()}-${i}`,
    provider: 'cn',
    sourceName: '中文素材',
    description: `${kw} · 中文素材`,
    url,
    thumb: url,
    photographer: '中文素材库',
    profileUrl: '',
    sourceUrl: '',
    license: '仅作设计参考',
    width: 0,
    height: 0,
  }))
}
