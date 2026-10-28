import { config } from '../config/index.js'
import fs from 'fs'
import path from 'path'
import { posterSkills } from '../skills/poster/index.js'

/**
 * DeepSeek Adapter —— 仅接入官方 API。
 * 注意：ChatGPT 网页订阅不能当作 API 使用；此处仅在有 API Key 时启用。
 */
export class DeepSeekAdapter {
  constructor() {
    this.provider = 'deepseek'
    this.baseUrl = config.providers.deepseek.baseUrl
    this.apiKey = config.providers.deepseek.apiKey
  }

  get available() {
    return !!this.apiKey
  }

  async _chat(messages, model) {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`DeepSeek API ${res.status}: ${text.slice(0, 300)}`)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? ''
  }

  async text({ prompt, system, model }) {
    const content = await this._chat(
      [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt },
      ],
      model
    )
    return { mock: false, model, content }
  }

  async analyzeImage({ imagePath, prompt, model }) {
    if (!imagePath || !fs.existsSync(imagePath)) throw new Error('参考图文件不存在，无法进行风格分析')
    const extension = path.extname(imagePath).toLowerCase()
    const mime = extension === '.webp' ? 'image/webp' : extension === '.png' ? 'image/png' : 'image/jpeg'
    const image = fs.readFileSync(imagePath).toString('base64')
    const content = await this._chat(
      [
      { role: 'system', content: posterSkills.referenceAnalysis },
      { role: 'user', content: [
        { type: 'text', text: `${prompt}\n只分析视觉风格，不复刻海报文字或构图。返回 JSON：palette（3 个十六进制色值）、dark（布尔值）、paletteNotes、composition、typography、whitespace、decoration。` },
        { type: 'image_url', image_url: { url: `data:${mime};base64,${image}` } },
      ] }],
      model
    )
    return { mock: false, model, content }
  }
}
