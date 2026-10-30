import { config } from '../config/index.js'

/**
 * 智谱 AI（Zhipu / BigModel）CogView 文生图 Adapter。
 * 接口：https://open.bigmodel.cn/api/paas/v4/images/generations
 * 模型：cogview-3-flash —— 官方价目表「免费」档，中文 prompt 理解强，3-8 秒出图。
 *
 * 关键优势（相对于 Pollinations 匿名层）：
 * - 原生中文理解，不会跑题
 * - 支持 n 参数一次生成多张「真实不同」的图（而非像素级变体）
 * - 国内直连，速度快
 *
 * 限制：
 * - 免费档有并发/速率限制（高峰期可能排队），因此本层必须配合「落盘缓存 + 关键词复用」
 * - Key 从 ZHIPU_API_KEY 读取；未配置时 available=false，自动降级到 Pollinations 兜底
 */
export class ZhipuAdapter {
  constructor() {
    this.provider = 'zhipu'
    this.baseUrl = config.providers.zhipu?.baseUrl || 'https://open.bigmodel.cn/api/paas/v4'
    this.apiKey = config.providers.zhipu?.apiKey || ''
  }

  get available() {
    return !!this.apiKey
  }

  /**
   * 生成一张或多张图，返回图片 URL 数组。
   * @param {object} opts { prompt, width, height, n }
   */
  async generateImage({ prompt, width = 1080, height = 1440, n = 1, model = 'cogview-3-flash' }) {
    if (!this.apiKey) throw new Error('未配置 ZHIPU_API_KEY')
    const size = this._sizeFor(width, height)
    const res = await fetch(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model, prompt, size, n: Math.min(4, Math.max(1, n)) }),
      signal: AbortSignal.timeout(90000),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const err = new Error(`智谱生图失败 HTTP ${res.status}: ${text.slice(0, 300)}`)
      err.status = res.status
      // 429 / 限速时标记，便于上层降级
      if (res.status === 429) err.rateLimited = true
      throw err
    }

    const data = await res.json()
    const urls = (data?.data || []).map((item) => item.url).filter(Boolean)
    if (!urls.length) throw new Error(`智谱未返回图片：${JSON.stringify(data).slice(0, 200)}`)
    return { urls, provider: 'zhipu', model }
  }

  /** 智谱 CogView 支持的固定尺寸 */
  _sizeFor(width, height) {
    const ratio = width / height
    const allowed = ['1024x1024', '768x1024', '1024x768', '768x1344', '1344x768', '1440x720', '720x1440']
    if (ratio > 1.3) return '1344x768'
    if (ratio < 0.78) return '768x1344'
    if (ratio > 1.05) return '1024x768'
    if (ratio < 0.95) return '768x1024'
    return '1024x1024'
  }
}
