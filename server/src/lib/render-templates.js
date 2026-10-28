import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { renderPoster } from './renderer.js'
import { generateLayouts } from './layouts.js'
import { TEMPLATE_CASES } from './template-cases.js'
import { photoForTemplate } from './template-photos.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '../../public/templates')

const ALT_PALETTES = [
  ['#38d9f5', '#5b6cff', '#7c5cff'],
  ['#f0a17c', '#d96b4c', '#2a1c14'],
  ['#d9ff72', '#38d9f5', '#171914'],
  ['#f5e6c8', '#c8a24a', '#2a2216'],
  ['#c9b8ff', '#8a6cff', '#1d1830'],
]

/**
 * 渲染灵感库案例海报 PNG。
 * 每个案例渲染主版式 + 一个换色换版式的 B 版，让关键词检索与「换一换」有足够内容。
 */
export async function renderTemplateCases() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
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
      const filename = `tpl-${slug}${isAlt ? '-alt' : ''}-photo.png`
      const buf = await renderPoster({
        width: c.canvas.width,
        height: c.canvas.height,
        background: layout.background,
        layers: layout.layers,
      })
      fs.writeFileSync(path.join(OUT_DIR, filename), buf)

      results.push({
        slug: isAlt ? `${slug}-alt` : slug,
        imageUrl: `/templates/${filename}`,
        layers: layout.layers,
        background: layout.background,
        feature: layout.feature,
        stockAsset,
      })
      console.log(`[templates] 已渲染 ${c.name}${isAlt ? '（B 版）' : ''} → ${filename}`)
    }
  }

  return results
}
