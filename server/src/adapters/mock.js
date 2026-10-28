import { sleep } from '../lib/util.js'
import { createCanvas, loadImage } from '@napi-rs/canvas'

const FALLBACK_PALETTE = ['#7c5cff', '#5b6cff', '#38d9f5']

function hexColor(r, g, b) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`
}

async function paletteFromImage(imagePath) {
  if (!imagePath) return { palette: FALLBACK_PALETTE, dark: true, imageRatio: null }
  try {
    const image = await loadImage(imagePath)
    const canvas = createCanvas(48, 48)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0, 48, 48)
    const pixels = ctx.getImageData(0, 0, 48, 48).data
    const bins = new Map()
    let luminance = 0
    let count = 0
    for (let i = 0; i < pixels.length; i += 16) {
      if (pixels[i + 3] < 200) continue
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
      const bucket = [r, g, b].map((v) => Math.floor(v / 32) * 32 + 16)
      const key = bucket.join(',')
      bins.set(key, (bins.get(key) || 0) + 1)
      luminance += 0.2126 * r + 0.7152 * g + 0.0722 * b
      count++
    }
    const ranked = [...bins.entries()]
      .map(([key, frequency]) => {
        const [r, g, b] = key.split(',').map(Number)
        const saturation = Math.max(r, g, b) - Math.min(r, g, b)
        return { color: hexColor(r, g, b), rgb: [r, g, b], score: frequency * (0.65 + saturation / 255) }
      })
      .sort((a, b) => b.score - a.score)
    const chosen = []
    for (const candidate of ranked) {
      if (chosen.every((entry) => Math.sqrt(entry.rgb.reduce((sum, value, i) => sum + (value - candidate.rgb[i]) ** 2, 0)) > 66)) {
        chosen.push(candidate)
      }
      if (chosen.length === 3) break
    }
    const palette = chosen.map((entry) => entry.color)
    while (palette.length < 3) palette.push(FALLBACK_PALETTE[palette.length])
    return {
      palette,
      dark: count ? luminance / count < 132 : true,
      imageRatio: image.width && image.height ? image.width / image.height : null,
    }
  } catch {
    return { palette: FALLBACK_PALETTE, dark: true, imageRatio: null }
  }
}

/**
 * Mock Provider —— 演示完整工作流，不伪装成真实生成。
 * 当真实供应商 API 凭据未配置时自动使用。
 * 所有返回都带 mock: true 标注，前端会明确提示「演示模式」。
 */

export class MockAdapter {
  constructor() {
    this.provider = 'mock'
  }

  async text({ prompt, system, model }) {
    await sleep(400)
    return {
      mock: true,
      model,
      content: this._textResponse(prompt),
    }
  }

  async analyzeImage({ imagePath, prompt, model }) {
    await sleep(300)
    const extracted = await paletteFromImage(imagePath)
    const [primary, secondary, accent] = extracted.palette
    const orientation = extracted.imageRatio && extracted.imageRatio < 0.82
      ? '竖向画布'
      : extracted.imageRatio && extracted.imageRatio > 1.2
        ? '横向画布'
        : '方形画布'
    return {
      mock: true,
      model,
      content: {
        primary,
        secondary,
        accent,
        palette: extracted.palette,
        dark: extracted.dark,
        paletteNotes: '演示模式：主色板由上传图片的像素采样提取；构图、字体与装饰建议为通用规则，尚未调用视觉大模型。',
        composition: `${orientation}参考图已识别；生成时将采用新的主视觉构图，并保留参考色彩方向。`,
        typography: '主标题建议使用高字重中文黑体，副标题与信息区降低字重并拉开层级。',
        whitespace: '建议保留约 20% 负空间，避免文字覆盖海报主视觉。',
        decoration: '使用少量立体光影、弧线与材质细节丰富画面，避免平铺色块。',
        mock: true,
      },
    }
  }

  async generateImage({ prompt, width, height, model }) {
    await sleep(800)
    return {
      mock: true,
      model,
      width,
      height,
      // Mock 只返回任务元信息；版式引擎会绘制与用途匹配的原创矢量主视觉。
      background: this._gradientFor(prompt),
    }
  }

  _textResponse(prompt) {
    const hasTitle = /标题|title|headline/i.test(prompt)
    if (hasTitle) {
      return JSON.stringify({
        options: [
          { headline: '突破边界', sub: '让每一张海报都成为焦点' },
          { headline: '灵感即现', sub: 'AI 驱动，秒级成图' },
          { headline: '所见即所得', sub: '文字精准，版式自由' },
        ],
        mock: true,
      })
    }
    return JSON.stringify({
      summary: '演示模式：这是 mock 模型的文本输出，接入真实 API 后返回供应商结果。',
      mock: true,
    })
  }

  _gradientFor(prompt) {
    // 根据 prompt 关键词选择渐变方向，模拟不同版式
    const dirs = ['135deg', '45deg', '90deg', '180deg', '20deg']
    const idx = Math.abs([...prompt].reduce((a, c) => a + c.charCodeAt(0), 0)) % dirs.length
    return {
      gradient: `linear-gradient(${dirs[idx]}, rgba(124,92,255,0.9), rgba(91,108,255,0.85), rgba(56,217,245,0.7))`,
      dark: true,
    }
  }
}
