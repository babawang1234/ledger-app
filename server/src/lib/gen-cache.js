import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * AI 生图落盘缓存层。
 *
 * 为什么需要它：
 * 免费生图 API（智谱 CogView-3-Flash / 魔搭 Qwen-Image）都有「每日额度 + 并发限制」，
 * 面向大众时，如果每次搜索都真实调 API，几十个并发就把额度打爆。
 *
 * 策略：按「关键词 + 尺寸」做 hash，生成结果落盘。下次相同关键词直接命中缓存，
 * 把免费额度从「250 次/天」放大为「250 个不同关键词/天」，足够支撑中型站点早期运营。
 *
 * 命中返回本地图片的 data URL / 路径，不再消耗额度。
 */
const CACHE_DIR = path.resolve(__dirname, '../../data/gen-cache')

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })
}

function cacheKey(prompt, width, height) {
  const normalized = String(prompt || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const hash = crypto.createHash('md5').update(`${normalized}|${width}x${height}`).digest('hex')
  return { hash, normalized }
}

/** 查询缓存：命中返回 Buffer 数组，未命中返回 null */
export function getCachedGeneration(prompt, width, height) {
  try {
    ensureDir()
    const { hash } = cacheKey(prompt, width, height)
    const dir = path.join(CACHE_DIR, hash)
    if (!fs.existsSync(dir)) return null
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg') || f.endsWith('.png')).sort()
    if (!files.length) return null
    return files.map((f) => fs.readFileSync(path.join(dir, f)))
  } catch (e) {
    console.warn('[gen-cache] 读缓存失败：', e.message)
    return null
  }
}

/** 写入缓存：保存一批图片 Buffer，返回数量 */
export function setCachedGeneration(prompt, width, height, buffers) {
  try {
    ensureDir()
    const { hash } = cacheKey(prompt, width, height)
    const dir = path.join(CACHE_DIR, hash)
    fs.mkdirSync(dir, { recursive: true })
    buffers.forEach((buf, i) => {
      if (buf && buf.length > 1000) {
        fs.writeFileSync(path.join(dir, `${String(i).padStart(2, '0')}.jpg`), buf)
      }
    })
    return buffers.length
  } catch (e) {
    console.warn('[gen-cache] 写缓存失败：', e.message)
    return 0
  }
}

/** 清空缓存（管理用） */
export function clearGenerationCache() {
  try {
    if (fs.existsSync(CACHE_DIR)) {
      fs.rmSync(CACHE_DIR, { recursive: true, force: true })
    }
    return true
  } catch (e) {
    console.warn('[gen-cache] 清空失败：', e.message)
    return false
  }
}

export { CACHE_DIR }
