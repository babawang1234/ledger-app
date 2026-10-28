import { config } from '../config/index.js'
import fs from 'fs'
import path from 'path'
import { posterSkills } from '../skills/poster/index.js'

function imageSizeFor(model, width, height) {
  const ratio = width / height
  if (/^gpt-image/i.test(model)) {
    if (ratio > 1.2) return '1536x1024'
    if (ratio < 0.82) return '1024x1536'
    return '1024x1024'
  }
  if (ratio > 1.2) return '1792x1024'
  if (ratio < 0.82) return '1024x1792'
  return '1024x1024'
}

/**
 * OpenAI Adapter —— 仅接入官方 API（api.openai.com）。
 * 不将 ChatGPT 网页订阅当作 API 使用。
 */
export class OpenAIAdapter {
  constructor() {
    this.provider = 'openai'
    this.baseUrl = config.providers.openai.baseUrl
    this.apiKey = config.providers.openai.apiKey
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
      throw new Error(`OpenAI API ${res.status}: ${text.slice(0, 300)}`)
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
    const mime = extension === '.webp' ? 'image/webp' : extension === '.gif' ? 'image/gif' : extension === '.png' ? 'image/png' : 'image/jpeg'
    const image = fs.readFileSync(imagePath).toString('base64')
    const content = await this._chat(
      [
        { role: 'system', content: posterSkills.referenceAnalysis },
        {
        role: 'user',
        content: [
          { type: 'text', text: `${prompt}\n请直接查看附图。只分析视觉风格，不要复刻海报文字或构图。返回 JSON：palette（3 个十六进制色值）、dark（布尔值）、paletteNotes、composition、typography、whitespace、decoration。` },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${image}` } },
        ],
        },
      ],
      model
    )
    return { mock: false, model, content }
  }

  async generateImage({ prompt, width, height, model, referencePath, stockAsset }) {
    const useStock = !!stockAsset?.url
    if (useStock && !stockAsset.url.startsWith('https://images.unsplash.com/')) throw new Error('图库素材地址无效')
    const editImagePath = referencePath && fs.existsSync(referencePath) ? referencePath : null
    const endpoint = editImagePath || useStock ? '/images/edits' : '/images/generations'
    let body
    let headers = { Authorization: `Bearer ${this.apiKey}` }
    if (editImagePath || useStock) {
      let bytes
      let mime = 'image/jpeg'
      let filename = 'reference.jpg'
      if (editImagePath) {
        bytes = fs.readFileSync(editImagePath)
        mime = path.extname(editImagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg'
        filename = path.basename(editImagePath)
      } else {
        const response = await fetch(stockAsset.url)
        if (!response.ok) throw new Error(`无法读取 Unsplash 素材（HTTP ${response.status}）`)
        bytes = Buffer.from(await response.arrayBuffer())
        if (bytes.length > 20 * 1024 * 1024) throw new Error('Unsplash 素材超出 20 MB')
      }
      body = new FormData()
      body.set('model', model)
      body.set('prompt', `${prompt}. Create an original poster hero image that meaningfully uses the source photo; preserve the real subject where possible, and do not reproduce reference text or layout.`)
      body.set('image', new Blob([bytes], { type: mime }), filename)
      body.set('size', imageSizeFor(model, width, height))
      body.set('quality', 'high')
    } else {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify({ model, prompt, n: 1, size: imageSizeFor(model, width, height), quality: 'high', output_format: 'png' })
    }
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`OpenAI Images API ${res.status}: ${text.slice(0, 300)}`)
    }
    const data = await res.json()
    return { mock: false, model, url: data.data?.[0]?.url, b64_json: data.data?.[0]?.b64_json }
  }
}
