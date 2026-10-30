import { generateLayouts } from './layouts.js'
import { TEMPLATE_CASES } from './template-cases.js'
import { photoForTemplate } from './template-photos.js'

const ALT_PALETTES = [
  ['#38d9f5', '#5b6cff', '#7c5cff'],
  ['#f0a17c', '#d96b4c', '#2a1c14'],
  ['#d9ff72', '#38d9f5', '#171914'],
  ['#f5e6c8', '#c8a24a', '#2a2216'],
  ['#c9b8ff', '#8a6cff', '#1d1830'],
]

/**
 * 渲染灵感库案例海报（仅生成图层数据，不落盘 PNG）。
 * 模板缩略图直接使用远程摄影照片（Unsplash CDN 免商用），
 * 彻底避免本地图片堆积占用磁盘；海报成品由前端 PosterCanvas 用 layers 实时渲染。
 */
export async function renderTemplateCases() {
  const results = []
  const variantOrder = ['center', 'left', 'split', 'bold']

  for (const [caseIndex, c] of TEMPLATE_CASES.entries()) {
    const stockAsset = photoForTemplate(caseIndex)

    for (const isAlt of [false, true]) {
      const altPalette = ALT_PALETTES[(caseIndex + (isAlt ? 2 : 0)) % ALT_PALETTES.length]
      const layouts = generateLayouts({
        content: c.content,
        purpose: c.purpose,
        canvas: c.canvas,
        styleAnalysis: { palette: isAlt ? altPalette : c.style.palette },
        artwork: stockAsset.url,
        stockAsset,
      })
      const variantMap = { center: 0, left: 1, split: 2, bold: 3 }
      const variant = isAlt
        ? variantOrder[(variantOrder.indexOf(c.layoutVariant) + 2) % 4]
        : c.layoutVariant
      const layout = layouts[variantMap[variant] ?? 0]

      const slug = c.name.replace(/[^\w\u4e00-\u9fa5-]+/g, '-')

      results.push({
        slug: isAlt ? `${slug}-alt` : slug,
        // 缩略图直接指向远程摄影照片，不再生成本地 PNG
        imageUrl: stockAsset.url,
        layers: layout.layers,
        background: layout.background,
        feature: layout.feature,
        stockAsset,
      })
    }
  }

  return results
}
