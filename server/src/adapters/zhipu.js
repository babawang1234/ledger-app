import { config } from '../config/index.js'

/**
 * 智谱 AI（Zhipu / BigModel）CogView 文生图 Adapter。
 * 接口：https://open.bigmodel.cn/api/paas/v4/images/generations
 * 默认模型：cogview-3-plus（质量可靠，中文理解准）。
 *
 * 实测（2026-10）关键结论：
 * - cogview-3-flash（免费档）：质量极不稳定，具体词（火锅）和抽象词（中国风）都会严重跑题，
 *   不适合面向大众的海报生图。仅作极低成本的兜底。
 * - cogview-3-plus（付费档，约 0.05 元/张，新用户有赠送额度）：语义理解准确，质量合格，默认使用。
 * - 免费档不支持 n 参数（传 n=4 也只返回 1 张），有严格速率限制（并发 2 次即 1302 限流）。
 *   因此「多张不同图」的正确做法：串行调用多次，每次 1 张，用不同 prompt 变体。
 *
 * 上层（gen-cache）已做落盘缓存，同一关键词只生成一次，降低付费额度消耗。
 */

/**
 * prompt 策略：实测 cogview-3-plus 对「纯关键词」理解最稳定，
 * 任何后缀（实拍/中国风/高清/设计感等）都会导致严重跑题（火锅→山水画/人物/星空）。
 * 因此所有张都用纯关键词，靠模型自身随机性产生差异（同词多次生成天然不同）。
 */
const VARIANT_HINTS = [
  '',   // 全部用纯关键词，不加任何后缀（避免跑题）
]

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
   * 串行生成多张图（每次 1 张，间隔限速），返回图片 URL 数组。
   * @param {object} opts { prompt, width, height, n }
   */
  async generateImage({ prompt, width = 1080, height = 1440, n = 1, model = 'cogview-3-plus' }) {
    if (!this.apiKey) throw new Error('未配置 ZHIPU_API_KEY')
    const size = this._sizeFor(width, height)
    const count = Math.min(6, Math.max(1, n))
    const urls = []

    for (let i = 0; i < count; i++) {
      // 每次用不同 prompt 变体，让图真正不同
      const variantPrompt = prompt + VARIANT_HINTS[i % VARIANT_HINTS.length]
      const url = await this._generateOne(variantPrompt, size, model)
      if (url) urls.push(url)
      // 免费档限速：串行 + 间隔，避免 1302 限流
      if (i < count - 1) await this._sleep(8000)
    }

    if (!urls.length) throw new Error('智谱未返回任何图片')
    return { urls, provider: 'zhipu', model }
  }

  /** 生成单张图，返回 URL；限流/失败时返回 null（不中断整体） */
  async _generateOne(prompt, size, model) {
    try {
      const res = await fetch(`${this.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ model, prompt, size, n: 1 }),
        signal: AbortSignal.timeout(90000),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        // 1302/429 限流：静默跳过，返回 null，让上层拿到已成功的那几张
        if (res.status === 429 || text.includes('1302') || text.includes('速率')) {
          console.warn('[zhipu] 触发速率限制，跳过本次')
          return null
        }
        throw new Error(`智谱生图失败 HTTP ${res.status}: ${text.slice(0, 200)}`)
      }

      const data = await res.json()
      const url = data?.data?.[0]?.url
      return url || null
    } catch (e) {
      // 单张失败不中断，继续下一张
      console.warn('[zhipu] 单张生成失败：', e.message)
      return null
    }
  }

  _sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

  /** 智谱 CogView 支持的固定尺寸 */
  _sizeFor(width, height) {
    const ratio = width / height
    if (ratio > 1.3) return '1344x768'
    if (ratio < 0.78) return '768x1344'
    if (ratio > 1.05) return '1024x768'
    if (ratio < 0.95) return '768x1024'
    return '1024x1024'
  }
}
