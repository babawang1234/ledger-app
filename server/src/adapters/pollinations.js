import { config } from '../config/index.js'

/**
 * Pollinations.ai Adapter —— 免 Key、免注册的免费 AI 文生图服务。
 * URL 即出图：https://image.pollinations.ai/prompt/{prompt}?width=&height=&nologo=true
 *
 * 特性与限制（已实测 2026-10）：
 * - 匿名层限速：每 IP 45 秒 1 张（返回 402 FREE_LIMIT，会带 retry-after）
 * - 中文 prompt 理解差（会跑题），必须用英文 prompt
 * - 匿名层实际模型为 Sana（请求 model=flux 会静默返回 Sana 图）
 * - 有轻微 pollinations.ai 水印（nologo 参数在匿名层不稳定）
 *
 * 定位：作为「未配置 DASHSCOPE_API_KEY 时的真实 AI 生图兜底」，
 * 取代之前「仅返回渐变底图」的伪生成，让用户真正看到 AI 按关键词生图。
 */
export class PollinationsAdapter {
  constructor() {
    this.provider = 'pollinations'
    this.baseUrl = config.providers.pollinations?.baseUrl || 'https://image.pollinations.ai'
  }

  get available() {
    // 免 Key，始终可用（是否启用由 config 的开关决定）
    return config.providers.pollinations?.enabled !== false
  }

  /**
   * 生成一张图，返回图片 Buffer。
   * @param {object} opts { prompt, width, height, seed }
   */
  async generateImage({ prompt, width = 1080, height = 1440, seed, model = 'flux' }) {
    const url = new URL(`${this.baseUrl}/prompt/${encodeURIComponent(prompt)}`)
    url.searchParams.set('width', String(Math.min(2048, Math.max(256, width))))
    url.searchParams.set('height', String(Math.min(2048, Math.max(256, height))))
    url.searchParams.set('nologo', 'true')
    if (seed != null) url.searchParams.set('seed', String(seed))
    if (model) url.searchParams.set('model', model)

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(90000),
      headers: { 'User-Agent': 'Mozilla/5.0 (poster-studio)' },
    })

    if (res.status === 402) {
      const err = new Error('POLLINATIONS_RATE_LIMITED')
      err.status = 402
      err.retryAfter = 45
      throw err
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Pollinations 生图失败 HTTP ${res.status}: ${text.slice(0, 200)}`)
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 1000) {
      throw new Error('Pollinations 返回的图片过小，可能生成失败')
    }
    return { buffer: await removeWatermark(buffer), provider: 'pollinations' }
  }
}

/**
 * 由一张底图派生出多张视觉变体（裁剪/色调/镜像/缩放），
 * 用于绕过匿名层 45 秒限速——一次真实生图即可得到多张可用的差异化底图。
 */
export async function deriveVariants(buffer, count = 4) {
  const { createCanvas, loadImage } = await import('@napi-rs/canvas')
  const img = await loadImage(buffer)
  const w = img.width
  const h = img.height
  const variants = []
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')

  for (let i = 0; i < count; i++) {
    ctx.save()
    ctx.clearRect(0, 0, w, h)
    // 变体策略：0 原图微调 / 1 亮度提亮 / 2 冷暖色温 / 3 水平镜像 / 4 轻微放大裁切
    const mode = i % 5
    ctx.filter = 'none'
    if (mode === 1) ctx.filter = 'brightness(1.15) saturate(1.1)'
    else if (mode === 2) ctx.filter = 'sepia(0.18) saturate(1.2) hue-rotate(-8deg)'
    else if (mode === 4) ctx.filter = 'contrast(1.08) brightness(1.05)'

    if (mode === 3) {
      // 水平镜像
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(img, 0, 0, w, h)
    } else if (mode === 4) {
      // 放大 8% 中心裁切（模拟不同构图）
      const scale = 1.08
      const sw = w / scale
      const sh = h / scale
      ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, w, h)
    } else {
      ctx.drawImage(img, 0, 0, w, h)
    }
    ctx.restore()
    variants.push({ buffer: canvas.toBuffer('image/jpeg', 88), variant: i })
  }
  return variants
}

/**
 * 去除右下角 pollinations.ai 水印。
 * 匿名层 nologo 参数不稳定，水印固定在右下角，用画布把右下角一小块用相邻像素覆盖。
 */
async function removeWatermark(buffer) {
  try {
    const { createCanvas, loadImage } = await import('@napi-rs/canvas')
    const img = await loadImage(buffer)
    const w = img.width
    const h = img.height
    const canvas = createCanvas(w, h)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, w, h)

    // 水印位于右下角，较小（约占宽 18%、高 8%）。只覆盖右下角小块，
    // 用该区域左上方邻域的像素平均色填充，避免整条底部被抹掉。
    const mw = Math.round(w * 0.18)
    const mh = Math.round(h * 0.08)
    const mx = w - mw
    const my = h - mh

    // 取水印区上方一行的平均色作为覆盖色
    const sampleY = Math.max(0, my - 2)
    const sample = ctx.getImageData(mx, sampleY, mw, 2)
    const data = sample.data
    const pxCount = data.length / 4
    let r = 0, g = 0, b = 0
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2] }
    r = Math.round(r / pxCount); g = Math.round(g / pxCount); b = Math.round(b / pxCount)

    // 用平均色填充右下角小块（覆盖水印）
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillRect(mx, my, mw, mh)

    return canvas.toBuffer('image/jpeg', 90)
  } catch (e) {
    // 裁剪失败则原样返回（水印保留，但不影响主流程）
    console.warn('[pollinations] 去水印失败，保留原图：', e.message)
    return buffer
  }
}
