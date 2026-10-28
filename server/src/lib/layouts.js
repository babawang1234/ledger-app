import { createArtworkDataUrl } from './artwork.js'

const PALETTES = [
  { key: 'violet', name: '紫蓝科技', colors: ['#7c5cff', '#5b6cff', '#38d9f5'], dark: true },
  { key: 'sunset', name: '暖橙热情', colors: ['#ff6b6b', '#ff9f43', '#feca57'], dark: true },
  { key: 'ocean', name: '深海冷调', colors: ['#1b6ca8', '#3bc9db', '#63e6be'], dark: true },
  { key: 'mono', name: '极简黑白', colors: ['#f1f3f5', '#ced4da', '#495057'], dark: false },
  { key: 'forest', name: '青绿清新', colors: ['#0ca678', '#51cf66', '#94d82d'], dark: true },
  { key: 'rose', name: '玫瑰浪漫', colors: ['#f06595', '#f783ac', '#ffd43b'], dark: true },
]

function hexToRgb(hex) {
  const v = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255)
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function saturation(hex) {
  const [r, g, b] = hexToRgb(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max === 0 ? 0 : (max - min) / max
}

function lighten(hex, amount = 0.35) {
  const [r, g, b] = hexToRgb(hex).map((v) => Math.round(Math.min(1, v + amount) * 255))
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

function pickPalette(styleAnalysis) {
  const colors = styleAnalysis?.palette
  if (Array.isArray(colors) && colors.length >= 3) {
    const normalized = colors.slice(0, 3).map((color, i) => (/^#[0-9a-f]{6}$/i.test(color) ? color : PALETTES[0].colors[i]))
    const dark = styleAnalysis?.dark ?? normalized.every((c) => luminance(c) < 0.45)
    // 参考图色只做「点缀」：若整体灰暗浑浊（低饱和），主结构色回退到设计好的配色，
    // 只保留参考色中最饱和的一个作为 accent，避免整幅画面变成浑浊色块。
    const vividEnough = normalized.some((c) => saturation(c) > 0.3 && luminance(c) > 0.12)
    if (!vividEnough) {
      const base = dark ? PALETTES[0] : { ...PALETTES[3], dark: false }
      const mostVivid = [...normalized].sort((a, b) => saturation(b) - saturation(a))[0]
      const accent = saturation(mostVivid) > 0.15 ? mostVivid : base.colors[2]
      return { key: 'reference', name: '参考图配色', colors: [base.colors[0], base.colors[1], luminance(accent) < 0.35 ? lighten(accent, 0.3) : accent], dark }
    }
    const adjusted = normalized.map((c) => (dark && luminance(c) < 0.25 ? lighten(c, 0.25) : c))
    return { key: 'reference', name: '参考图配色', colors: adjusted, dark }
  }
  return PALETTES.find((p) => p.key === styleAnalysis?.preset) || PALETTES[0]
}

/** 标题字号自适应：长标题缩小、有下限，保证任何内容下标题都可读 */
function adaptiveTitleSize(text, base = 0.092, min = 0.056) {
  const len = String(text || '').length
  let size = base
  if (len > 14) size = base * 0.66
  else if (len > 9) size = base * 0.78
  else if (len > 6) size = base * 0.9
  return Math.max(min, size)
}

export function generateLayouts({ content = {}, purpose = '', canvas, styleAnalysis, artwork, stockAsset }) {
  const { width, height } = canvas
  const palette = pickPalette(styleAnalysis)
  const variants = [
    centerLayout,
    editorialLayout,
    splitLayout,
    boldLayout,
  ]

  return variants.map((layout, index) => {
    const artSrc = artwork || createArtworkDataUrl({ palette: palette.colors, purpose, content, variant: index })
    const result = stockAsset?.url
      ? photoLayout({ content, palette, width, height, artSrc, index, stockAsset })
      : layout({ content, palette, width, height, artSrc, index })
    if (stockAsset?.photographer) {
      result.layers.push({
        type: 'shape', kind: 'rect', x: 0, y: 0.963, width: 1, height: 0.037,
        color: 'rgba(0,0,0,.38)', zIndex: 89,
      })
      result.layers.push({
        type: 'text', text: `Photo: ${stockAsset.photographer} / ${stockAsset.sourceName || 'Unsplash'}`,
        x: 0.04, y: 0.975, fontSize: 0.011, fontWeight: 400,
        color: 'rgba(255,255,255,.82)',
        maxWidth: 0.92, zIndex: 90, sourceUrl: stockAsset.profileUrl,
        unsplashUrl: stockAsset.unsplashUrl, photographer: stockAsset.photographer,
      })
    }
    return {
      name: `方案 ${index + 1} · ${result.feature}`,
      feature: result.feature,
      palette: palette.name,
      canvas: { width, height },
      background: result.background,
      layers: result.layers,
      stockAttribution: stockAsset?.photographer ? {
        photographer: stockAsset.photographer,
        sourceName: stockAsset.sourceName || 'Unsplash',
        profileUrl: stockAsset.profileUrl,
        sourceUrl: stockAsset.sourceUrl || stockAsset.unsplashUrl,
        license: stockAsset.license || '',
      } : null,
    }
  })
}

function photoLayout({ content, palette, artSrc, index, stockAsset }) {
  if (stockAsset?.templateStyle) return craftedPhotoLayout({ content, palette, artSrc, index, stockAsset })
  const white = '#fffaf2'
  const photo = { type: 'image', src: artSrc, x: 0, y: 0, width: 1, height: 1, fit: 'cover', zIndex: 0 }
  // 压暗层 + 底部渐变 scrim：保证白字在任何照片上都可读
  const dim = { type: 'shape', kind: 'rect', x: 0, y: 0, width: 1, height: 1, color: '#07101b', opacity: [0.52, 0.58, 0.55, 0.6][index], zIndex: 1 }
  const bottomScrim = { type: 'shape', kind: 'rect', x: 0, y: 0.55, width: 1, height: 0.45, color: '#050a12', opacity: 0.45, zIndex: 2 }
  const masthead = brand(content, 0.075, 0.045, 'left', true)
  const titleLayouts = [
    { x: 0.075, y: 0.68, size: 0.092, maxWidth: 0.84, align: 'left' },
    { x: 0.08, y: 0.69, size: 0.082, maxWidth: 0.84, align: 'left' },
    { x: 0.075, y: 0.72, size: 0.086, maxWidth: 0.84, align: 'left' },
    { x: 0.5, y: 0.39, size: 0.105, maxWidth: 0.84, align: 'center' },
  ]
  const copy = titleLayouts[index]
  const layers = [photo, dim, bottomScrim, masthead]
  if (index === 1) {
    layers.push({ type: 'shape', kind: 'rect', x: 0, y: 0.61, width: 1, height: 0.39, color: '#090c16', opacity: 0.93, zIndex: 8 })
  } else {
    layers.push(rule(palette, copy.align === 'center' ? 0.46 : 0.075, Math.max(0.16, copy.y - 0.07), 0.08))
  }
  layers.push(title(content, { ...copy, color: white }))
  layers.push(subtitle(content, { x: copy.align === 'center' ? '50%' : copy.x, y: copy.y + 0.11, align: copy.align, color: 'rgba(255,250,242,.9)', maxWidth: 0.84 }))
  layers.push(detail(content, { x: copy.align === 'center' ? '50%' : copy.x, y: copy.y + 0.18, align: copy.align, color: 'rgba(255,250,242,.72)', maxWidth: 0.82, size: 0.022 }))
  layers.push(...cta(content, palette, { x: copy.align === 'center' ? 0.34 : 0.075, y: 0.9, w: copy.align === 'center' ? 0.32 : 0.29, h: 0.045 }))
  return {
    feature: ['电影感摄影主视觉', '影像分区 · 杂志标题', '全幅摄影 · 左对齐信息', '居中宣言 · 沉浸式影像'][index],
    background: { color: '#090c16' },
    layers,
  }
}

function craftedPhotoLayout({ content, palette, artSrc, index = 0, stockAsset }) {
  const style = stockAsset.templateStyle
  const paper = '#f4f0e7'
  const ink = '#191916'
  const coral = '#f06b4f'
  const green = '#b9d56a'
  const photo = (x, y, width, height, radius = 0) => ({ type: 'image', src: artSrc, x, y, width, height, fit: 'cover', radius, templateStyle: style, zIndex: 1 })
  const block = (x, y, width, height, color, zIndex = 3, radius = 0) => ({ type: 'shape', kind: 'rect', x, y, width, height, color, zIndex, radius })
  const label = (text, x, y, color = ink, size = 0.018, extra = {}) => ({ type: 'text', text, x, y, color, fontSize: size, fontWeight: 700, zIndex: 20, ...extra })
  const line = (x, y, color = ink, width = 0.08) => block(x, y, width, 0.004, color, 12)
  let layers = []
  let backgroundColor = paper
  let feature = ''

  if (style === 'concert') {
    backgroundColor = '#111111'
    layers = [photo(0, 0, 1, 1), block(0, 0, 1, 1, 'rgba(8,9,12,.25)', 2), brand(content, 0.07, 0.04, 'left', true), line(0.075, 0.66, '#d4ef75', 0.11), title(content, { x: 0.075, y: 0.70, size: 0.10, color: '#fffdf4', maxWidth: 0.84 }), subtitle(content, { x: 0.08, y: 0.82, size: 0.031, color: 'rgba(255,255,255,.9)' }), label([content.datetime, content.location].filter(Boolean).join('   /   '), 0.08, 0.88, '#dce4d1', 0.019)]
    feature = '现场摄影 · 音乐节主视觉'
  } else if (style === 'catalog') {
    layers = [photo(0.06, 0.055, 0.88, 0.55, 18), block(0.75, 0.075, 0.17, 0.17, green, 4, 99), label('50%', 0.775, 0.125, ink, 0.034, { maxWidth: 0.13, align: 'center' }), brand(content, 0.075, 0.63, 'left', false), title(content, { x: 0.075, y: 0.68, size: 0.075, color: ink, maxWidth: 0.85 }), subtitle(content, { x: 0.075, y: 0.78, size: 0.029, color: '#47473e' }), detail(content, { x: 0.075, y: 0.84, size: 0.021, color: '#66665d' }), block(0.075, 0.915, 0.26, 0.045, coral, 5, 8), label(content.cta || '立即选购', 0.095, 0.925, '#fffaf3', 0.021)]
    feature = '产品静物 · 电商促销版'
  } else if (style === 'portrait') {
    backgroundColor = '#1b1720'
    layers = [photo(0.25, 0, 0.75, 0.78), block(0, 0, 0.42, 1, '#1b1720', 2), brand(content, 0.07, 0.05, 'left', true), block(0.07, 0.2, 0.012, 0.13, coral, 4), label('PEOPLE / CULTURE', 0.1, 0.205, '#e8d7c6', 0.014), title(content, { x: 0.07, y: 0.36, size: 0.092, color: '#fffaf3', maxWidth: 0.75 }), subtitle(content, { x: 0.075, y: 0.52, size: 0.03, color: '#e3d7cf', maxWidth: 0.65 }), detail(content, { x: 0.075, y: 0.6, size: 0.019, color: '#bcb2b6', maxWidth: 0.68 }), label(content.cta || 'JOIN OUR TEAM', 0.075, 0.86, '#d8f878', 0.017)]
    feature = '人物肖像 · 编辑部招聘特刊'
  } else if (style === 'architecture') {
    layers = [brand(content, 0.065, 0.05, 'left', false), label('FORM / SPACE / FUTURE', 0.065, 0.16, '#77766d', 0.014), photo(0.29, 0.22, 0.65, 0.48), line(0.065, 0.25, ink, 0.12), title(content, { x: 0.065, y: 0.31, size: 0.082, color: ink, maxWidth: 0.69 }), subtitle(content, { x: 0.065, y: 0.47, size: 0.029, color: '#55554d', maxWidth: 0.68 }), block(0.065, 0.74, 0.87, 0.002, '#aaa79c', 4), detail(content, { x: 0.065, y: 0.79, size: 0.021, color: '#525149' }), label(content.cta || 'DISCOVER MORE  ↗', 0.065, 0.91, ink, 0.017)]
    feature = '建筑影像 · 瑞士网格版式'
  } else if (style === 'market') {
    layers = [brand(content, 0.065, 0.04, 'left', false), photo(0.065, 0.105, 0.87, 0.57, 14), block(0.08, 0.13, 0.2, 0.065, coral, 5, 4), label('WEEKEND', 0.095, 0.148, '#fffaf3', 0.018), title(content, { x: 0.065, y: 0.72, size: 0.079, color: ink, maxWidth: 0.83 }), subtitle(content, { x: 0.07, y: 0.82, color: '#4d4a43', size: 0.027 }), detail(content, { x: 0.07, y: 0.875, size: 0.019, color: '#767168' }), label(content.cta || '本周末见', 0.72, 0.92, ink, 0.02)]
    feature = '市集现场 · 撕纸色签海报'
  } else if (style === 'teachers-day' && index % 2 === 0) {
    backgroundColor = '#f2efe7'
    layers = [brand(content, 0.07, 0.035, 'left', false), label('A NOTE OF GRATITUDE', 0.075, 0.095, '#8a7850', 0.014, { letterSpacing: 1.2 }), photo(0.06, 0.14, 0.88, 0.49, 10), block(0.06, 0.14, 0.88, 0.49, 'rgba(21,31,25,.08)', 2, 10), line(0.075, 0.695, '#a98d52', 0.1), title(content, { x: 0.075, y: 0.725, size: 0.09, color: '#26362e', maxWidth: 0.84 }), subtitle(content, { x: 0.08, y: 0.825, size: 0.029, color: '#5f6256', maxWidth: 0.82 }), detail(content, { x: 0.08, y: 0.88, size: 0.019, color: '#77766b', maxWidth: 0.82 })]
    feature = '教师节致谢 · 课堂纪实影像'
  } else if (style === 'teachers-day' || style === 'teacher-mentor') {
    backgroundColor = '#263b32'
    layers = [brand(content, 0.07, 0.04, 'left', true), label('TEACHER APPRECIATION', 0.075, 0.21, '#d6c595', 0.013, { letterSpacing: 1.1 }), line(0.075, 0.26, '#bba46d', 0.1), title(content, { x: 0.075, y: 0.31, size: 0.083, color: '#fffaf0', maxWidth: 0.82 }), subtitle(content, { x: 0.08, y: 0.43, size: 0.026, color: '#e2ddcf', maxWidth: 0.82 }), photo(0.075, 0.56, 0.85, 0.31, 10), detail(content, { x: 0.08, y: 0.895, size: 0.018, color: '#d5d1c4', maxWidth: 0.82 })]
    feature = '师恩如光 · 深绿影像版'
  } else if (style === 'bakery') {
    backgroundColor = '#e8d7b9'
    layers = [photo(0.07, 0.065, 0.86, 0.53, 12), block(0.07, 0.065, 0.86, 0.53, 'rgba(17,15,12,.10)', 2), label('FRESH FROM THE OVEN', 0.09, 0.625, '#6a4d32', 0.015), title(content, { x: 0.075, y: 0.67, size: 0.087, color: '#2a2019', maxWidth: 0.86 }), subtitle(content, { x: 0.08, y: 0.79, size: 0.03, color: '#594638' }), detail(content, { x: 0.08, y: 0.85, size: 0.02, color: '#6c5b4b' }), block(0.075, 0.92, 0.3, 0.045, '#243f32', 4, 3), label(content.cta || '来店尝鲜', 0.095, 0.928, '#fff8e8', 0.019)]
    feature = '烘焙美食 · 暖调菜单封面'
  } else if (style === 'winter') {
    backgroundColor = '#eef1f1'
    layers = [brand(content, 0.07, 0.04, 'left', false), photo(0.07, 0.105, 0.86, 0.53), label('WINTER NOTE  /  01', 0.075, 0.68, '#6d8293', 0.015), title(content, { x: 0.075, y: 0.72, size: 0.078, color: '#243744', maxWidth: 0.85 }), subtitle(content, { x: 0.08, y: 0.82, color: '#596e7a', size: 0.027 }), detail(content, { x: 0.08, y: 0.88, color: '#6b7d85', size: 0.019 })]
    feature = '雪境风景 · 留白季刊封面'
  } else if (style === 'floral') {
    backgroundColor = '#f3e8e4'
    layers = [brand(content, 0.07, 0.04, 'left', false), photo(0.1, 0.095, 0.8, 0.57, 12), label('A LITTLE SOMETHING FOR YOU', 0.5, 0.705, '#9f706c', 0.013, { align: 'center', maxWidth: 0.8 }), title(content, { x: '50%', y: 0.745, align: 'center', size: 0.077, color: '#522f35', maxWidth: 0.88 }), subtitle(content, { x: '50%', y: 0.84, align: 'center', color: '#77545b', size: 0.025 }), label(content.cta || '把心意送给重要的人', 0.5, 0.915, '#aa635f', 0.017, { align: 'center', maxWidth: 0.85 })]
    feature = '花束静物 · 节日礼赠画报'
  } else if (style === 'anniversary') {
    backgroundColor = '#202820'
    layers = [photo(0.35, 0.1, 0.59, 0.62), block(0.35, 0.1, 0.59, 0.62, 'rgba(17,24,18,.12)', 2), brand(content, 0.07, 0.05, 'left', true), label('03', 0.055, 0.19, '#d8f878', 0.24), title(content, { x: 0.07, y: 0.58, size: 0.058, color: '#fffaf1', maxWidth: 0.27 }), subtitle(content, { x: 0.075, y: 0.68, color: '#d8dfd3', size: 0.021, maxWidth: 0.28 }), detail(content, { x: 0.075, y: 0.75, color: '#bbc1b6', size: 0.018, maxWidth: 0.29 }), block(0.075, 0.89, 0.28, 0.047, green, 4, 3), label(content.cta || '谢谢一路同行', 0.095, 0.9, '#1e2719', 0.018)]
    feature = '品牌纪念 · 大号数字纪念刊'
  } else {
    layers = [brand(content, 0.065, 0.05, 'left', false), photo(0.055, 0.11, 0.53, 0.72, 14), block(0.66, 0.19, 0.28, 0.004, coral, 4), label('NEW / 2026', 0.66, 0.13, '#77736a', 0.015), title(content, { x: 0.66, y: 0.26, size: 0.058, color: ink, maxWidth: 0.31 }), subtitle(content, { x: 0.66, y: 0.42, size: 0.021, color: '#5b5952', maxWidth: 0.31 }), detail(content, { x: 0.66, y: 0.53, size: 0.016, color: '#6e6a62', maxWidth: 0.31 }), block(0.66, 0.78, 0.27, 0.052, ink, 4, 3), label(content.cta || '即将上市', 0.68, 0.794, '#f4f0e7', 0.018)]
    feature = '新品静物 · 画册式分栏'
  }
  return { feature, background: { color: backgroundColor }, layers }
}

function background(palette, variant = 0) {
  const dark = palette.dark
  const base = dark ? '#090c16' : '#f4f0e8'
  const stops = dark
    ? [
        { offset: 0, color: alpha(palette.colors[0], 0.28) },
        { offset: 0.48, color: alpha(palette.colors[1], 0.12) },
        { offset: 1, color: 'rgba(7,10,18,0.94)' },
      ]
    : [
        { offset: 0, color: alpha(palette.colors[0], 0.20) },
        { offset: 0.55, color: alpha(palette.colors[1], 0.10) },
        { offset: 1, color: 'rgba(248,245,238,0.95)' },
      ]
  return { color: base, gradient: true, angle: [135, 18, 90, 165][variant], gradientStops: stops }
}

function alpha(hex, a) {
  const value = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16))
  return `rgba(${r},${g},${b},${a})`
}

function copyColor(palette) {
  return palette.dark ? '#fffaf2' : '#18202b'
}

function brand(content, x, y, align = 'left', dark = true) {
  return {
    type: 'text', text: content.brand || 'I’M NOT A WORKHORSE', x, y,
    fontSize: 0.022, fontWeight: 600, color: dark ? 'rgba(255,255,255,.72)' : 'rgba(24,32,43,.68)',
    align, letterSpacing: 1.3, zIndex: 10,
  }
}

function title(content, { x, y, size = 0.092, align = 'left', color, maxWidth = 0.84, weight = 800 }) {
  const headline = content.headline?.trim() || content.subheadline?.trim() || '主标题'
  return {
    type: 'text', text: headline, x, y, fontSize: adaptiveTitleSize(headline, size),
    fontWeight: weight, color, align, maxWidth, lineHeight: 1.08, zIndex: 20,
  }
}

function subtitle(content, { x, y, size = 0.034, align = 'left', color, maxWidth = 0.82 }) {
  return {
    type: 'text', text: content.subheadline || '', x, y, fontSize: size,
    fontWeight: 500, color, align, maxWidth, lineHeight: 1.35, zIndex: 21,
  }
}

function detail(content, { x, y, align = 'left', color, maxWidth = 0.82, size = 0.025 }) {
  const lines = [content.body, [content.datetime, content.location].filter(Boolean).join('  ·  ')].filter(Boolean)
  return {
    type: 'text', text: lines.join('\n'), x, y, fontSize: size,
    fontWeight: 400, color, align, maxWidth, lineHeight: 1.65, zIndex: 22,
  }
}

function cta(content, palette, { x = 0.34, y = 0.88, w = 0.32, h = 0.052 } = {}) {
  const fill = palette.colors[1]
  return [
    { type: 'shape', kind: 'rect', x, y, width: w, height: h, color: fill, radius: 999, zIndex: 30 },
    {
      type: 'text', text: content.cta || '立即了解', x: x + w / 2, y: y + h * 0.22,
      fontSize: h * 0.44, fontWeight: 700, color: palette.dark ? '#10121a' : '#fff',
      align: 'center', maxWidth: w * 0.9, zIndex: 31,
    },
  ]
}

function artwork(src, x, y, width, height, zIndex = 2) {
  return { type: 'image', src, x, y, width, height, fit: 'contain', zIndex }
}

function rule(palette, x, y, width = 0.08) {
  return { type: 'shape', kind: 'rect', x, y, width, height: 0.003, color: palette.colors[2], opacity: 0.9, radius: 4, zIndex: 12 }
}

function centerLayout({ content, palette, artSrc, index }) {
  const color = copyColor(palette)
  const layers = [
    artwork(artSrc, 0.13, 0.06, 0.74, 0.53),
    brand(content, '50%', 0.035, 'center', palette.dark),
    rule(palette, '46%', 0.585, 0.08),
    title(content, { x: '50%', y: 0.62, align: 'center', size: 0.082, color, maxWidth: 0.88 }),
    subtitle(content, { x: '50%', y: 0.725, align: 'center', color: alpha(color, 0.82), maxWidth: 0.86 }),
    detail(content, { x: '50%', y: 0.79, align: 'center', color: alpha(color, 0.66), maxWidth: 0.86, size: 0.022 }),
    ...cta(content, palette, { x: 0.34, y: 0.91, w: 0.32, h: 0.045 }),
  ]
  return { feature: '主视觉居中 · 留白标题区', background: background(palette, index), layers }
}

function editorialLayout({ content, palette, artSrc, index }) {
  const color = copyColor(palette)
  const layers = [
    artwork(artSrc, 0.34, 0.08, 0.62, 0.57),
    { type: 'shape', kind: 'rect', x: 0.055, y: 0.13, width: 0.003, height: 0.39, color: palette.colors[0], opacity: 0.8, zIndex: 9 },
    brand(content, 0.085, 0.055, 'left', palette.dark),
    title(content, { x: 0.085, y: 0.68, size: 0.075, color, maxWidth: 0.82 }),
    rule(palette, 0.085, 0.775, 0.075),
    subtitle(content, { x: 0.085, y: 0.80, size: 0.03, color: alpha(color, 0.84), maxWidth: 0.82 }),
    detail(content, { x: 0.085, y: 0.85, size: 0.021, color: alpha(color, 0.65), maxWidth: 0.82 }),
    ...cta(content, palette, { x: 0.67, y: 0.93, w: 0.25, h: 0.044 }),
  ]
  return { feature: '编辑画报 · 右侧插画焦点', background: background(palette, index), layers }
}

function splitLayout({ content, palette, artSrc, index }) {
  const color = copyColor(palette)
  const layers = [
    artwork(artSrc, 0.08, 0.025, 0.84, 0.52),
    { type: 'shape', kind: 'rect', x: 0.055, y: 0.59, width: 0.89, height: 0.003, color: alpha(color, 0.18), zIndex: 12 },
    brand(content, 0.075, 0.625, 'left', palette.dark),
    title(content, { x: 0.075, y: 0.675, size: 0.082, color, maxWidth: 0.84 }),
    subtitle(content, { x: 0.075, y: 0.78, size: 0.03, color: alpha(color, 0.84), maxWidth: 0.84 }),
    detail(content, { x: 0.075, y: 0.835, size: 0.021, color: alpha(color, 0.66), maxWidth: 0.84 }),
    ...cta(content, palette, { x: 0.075, y: 0.925, w: 0.3, h: 0.044 }),
  ]
  return { feature: '上下分栏 · 图像与信息分区', background: background(palette, index), layers }
}

function boldLayout({ content, palette, artSrc, index }) {
  const color = copyColor(palette)
  const layers = [
    artwork(artSrc, 0.18, 0.035, 0.66, 0.51),
    brand(content, 0.07, 0.045, 'left', palette.dark),
    { type: 'shape', kind: 'circle', x: 0.84, y: 0.08, width: 0.075, height: 0.075, color: palette.colors[2], opacity: 0.8, zIndex: 4 },
    title(content, { x: 0.07, y: 0.58, size: 0.12, color, maxWidth: 0.86 }),
    rule(palette, 0.075, 0.72, 0.1),
    subtitle(content, { x: 0.075, y: 0.76, size: 0.034, color: alpha(color, 0.86), maxWidth: 0.85 }),
    detail(content, { x: 0.075, y: 0.825, size: 0.022, color: alpha(color, 0.68), maxWidth: 0.84 }),
    ...cta(content, palette, { x: 0.66, y: 0.93, w: 0.27, h: 0.044 }),
  ]
  return { feature: '大标题冲击 · 独立主视觉', background: background(palette, index), layers }
}
