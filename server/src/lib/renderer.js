import { createCanvas, GlobalFonts, loadImage as loadCanvasImage } from '@napi-rs/canvas'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 注册系统字体（优先思源黑体/微软雅黑等中文字体）
const fontDir = path.resolve(__dirname, '../../fonts')
if (fs.existsSync(fontDir)) {
  for (const f of fs.readdirSync(fontDir)) {
    if (/\.(ttf|otf|ttc)$/i.test(f)) {
      GlobalFonts.registerFromPath(path.join(fontDir, f), path.basename(f, path.extname(f)))
    }
  }
}

// 中文字体回退栈（供 canvas 选择）
export const CJK_FONT_STACK = [
  'PingFang SC',
  'Microsoft YaHei',
  'Noto Sans CJK SC',
  'SimHei',
  'sans-serif',
].join(', ')

const SERIF_STACK = [
  'Noto Serif CJK SC',
  'SimSun',
  'STSong',
  'serif',
].join(', ')

export function fontStackFor(style = 'sans') {
  return style === 'serif' ? SERIF_STACK : CJK_FONT_STACK
}

/**
 * 渲染单张海报 PNG。
 * layers: 文字/图片/形状图层的独立数组，文字由排版引擎作为独立文字层渲染。
 */
export async function renderPoster({ width, height, background, layers }) {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  // 背景
  ctx.fillStyle = background?.color || '#0a0a14'
  ctx.fillRect(0, 0, width, height)

  // 渐变背景
  if (background?.gradient) {
    const stops = background.gradientStops || [
      { offset: 0, color: 'rgba(124,92,255,0.9)' },
      { offset: 0.55, color: 'rgba(91,108,255,0.85)' },
      { offset: 1, color: 'rgba(56,217,245,0.7)' },
    ]
    const angle = background.angle ?? 135
    const rad = (angle * Math.PI) / 180
    const cx = width / 2
    const cy = height / 2
    const len = Math.hypot(width, height) / 2
    const x0 = cx - Math.cos(rad) * len
    const y0 = cy - Math.sin(rad) * len
    const x1 = cx + Math.cos(rad) * len
    const y1 = cy + Math.sin(rad) * len
    const g = ctx.createLinearGradient(x0, y0, x1, y1)
    for (const s of stops) g.addColorStop(s.offset, s.color)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, width, height)
  }

  // 光晕装饰
  if (background?.glow) {
    const gcx = width / 2
    const gcy = height / 2 - height * 0.1
    const r = Math.max(width, height) * 0.6
    const g = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, r)
    g.addColorStop(0, 'rgba(124,92,255,0.28)')
    g.addColorStop(1, 'rgba(124,92,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, width, height)
  }

  // 按 zIndex 排序渲染图层
  const sorted = [...layers].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
  for (const layer of sorted) {
    if (layer.visible === false) continue
    if (layer.type === 'text') await drawText(ctx, layer, width, height)
    else if (layer.type === 'shape') drawShape(ctx, layer, width, height)
    else if (layer.type === 'image') await drawImage(ctx, layer, width, height)
  }

  const buffer = canvas.toBuffer('image/png')
  return buffer
}

function px(v, ref, canvas) {
  // 支持数值像素、比例小数（<=1，按 ref 的百分比）、百分比字符串
  if (typeof v === 'number') {
    if (v > 0 && v <= 1) return v * ref // 比例小数
    return v
  }
  if (typeof v === 'string' && v.endsWith('%')) {
    return (parseFloat(v) / 100) * ref
  }
  return parseFloat(v) || 0
}

function drawText(ctx, layer, w, h) {
  const {
    text,
    x,
    y,
    fontSize,
    fontFamily,
    fontWeight = 700,
    color = '#ffffff',
    align = 'left',
    letterSpacing = 0,
    lineHeight = 1.3,
    maxWidth,
    shadow,
    stroke,
  } = layer

  const size = px(fontSize, w, w)
  const font = `${fontWeight} ${size}px ${fontFamily || CJK_FONT_STACK}`
  ctx.font = font
  ctx.textAlign = align
  ctx.textBaseline = 'top'
  ctx.fillStyle = color

  if (stroke) {
    ctx.strokeStyle = stroke.color || '#000'
    ctx.lineWidth = stroke.width || 0
  }
  if (shadow) {
    ctx.shadowColor = shadow.color || 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = shadow.blur || 0
    ctx.shadowOffsetX = shadow.offsetX || 0
    ctx.shadowOffsetY = shadow.offsetY || 0
  }

  const lx = px(x, w, w)
  let ly = px(y, h, h)
  const maxW = maxWidth ? px(maxWidth, w, w) : w - lx

  const lines = []
  for (const paragraph of String(text ?? '').split('\n')) {
    let line = ''
    for (const character of Array.from(paragraph)) {
      const candidate = line + character
      if (line && ctx.measureText(candidate).width > maxW) {
        lines.push(line)
        line = character
      } else line = candidate
    }
    lines.push(line)
  }
  const leading = size * (lineHeight || 1.3)
  lines.forEach((line, index) => {
    const yPos = ly + index * leading
    if (letterSpacing && align === 'left') {
      let cx = lx
      for (const ch of Array.from(line)) {
        ctx.fillText(ch, cx, yPos)
        if (stroke) ctx.strokeText(ch, cx, yPos)
        cx += ctx.measureText(ch).width + letterSpacing
      }
    } else {
      ctx.fillText(line, lx, yPos, maxW)
      if (stroke) ctx.strokeText(line, lx, yPos, maxW)
    }
  })

  // 复位阴影
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
}

function drawShape(ctx, layer, w, h) {
  const { kind = 'rect', x, y, width, height, color, opacity = 1, radius = 0 } = layer
  const lx = px(x, w, w)
  const ly = px(y, h, h)
  const lw = px(width, w, w)
  const lh = px(height, h, h)
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.fillStyle = color || '#ffffff'
  if (kind === 'circle') {
    ctx.beginPath()
    ctx.arc(lx + lw / 2, ly + lh / 2, lw / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    if (radius > 0) {
      const r = Math.min(radius, lw / 2, lh / 2)
      roundRect(ctx, lx, ly, lw, lh, r)
      ctx.fill()
    } else {
      ctx.fillRect(lx, ly, lw, lh)
    }
  }
  ctx.restore()
}

async function drawImage(ctx, layer, w, h) {
  const { src, x, y, width, height, opacity = 1, fit = 'cover', radius = 0 } = layer
  if (!src) return
  let img
  try {
    // 支持本地路径或 base64 data URL
    if (typeof src === 'string' && src.startsWith('data:')) {
      img = await loadImage(src)
    } else if (typeof src === 'string' && src.startsWith('https://')) {
      await assertPublicImageUrl(src)
      const response = await fetch(src, { redirect: 'error', signal: AbortSignal.timeout(10000) })
      if (!response.ok) throw new Error(`素材加载失败：${response.status}`)
      if (!String(response.headers.get('content-type') || '').startsWith('image/')) throw new Error('素材源返回的不是图片')
      const bytes = Buffer.from(await response.arrayBuffer())
      if (bytes.length > 20 * 1024 * 1024) throw new Error('素材超出 20 MB')
      img = await loadImage(bytes)
    } else {
      const localSource = layer.localPath || (src.startsWith('/generated/')
        ? path.resolve(__dirname, '../../public/generated', path.basename(src))
        : src)
      img = await loadImage(localSource)
    }
  } catch {
    return // 图片加载失败则跳过该图层
  }
  const lx = px(x, w, w)
  const ly = px(y, h, h)
  const lw = px(width, w, w)
  const lh = px(height, h, h)
  ctx.save()
  ctx.globalAlpha = opacity
  if (radius > 0) {
    roundRect(ctx, lx, ly, lw, lh, radius)
    ctx.clip()
  }
  // fit 计算
  let sx = 0, sy = 0, sw = img.width, sh = img.height
  let dx = lx, dy = ly, dw = lw, dh = lh
  if (fit === 'contain') {
    const scale = Math.min(lw / img.width, lh / img.height)
    dw = img.width * scale
    dh = img.height * scale
    dx = lx + (lw - dw) / 2
    dy = ly + (lh - dh) / 2
  } else if (fit === 'cover') {
    const scale = Math.max(lw / img.width, lh / img.height)
    sw = lw / scale
    sh = lh / scale
    sx = (img.width - sw) / 2
    sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
  ctx.restore()
}

async function assertPublicImageUrl(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new Error('仅允许安全的 HTTPS 图片源')
  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) throw new Error('不允许访问本地地址')
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true })
  if (!addresses.length || addresses.some(({ address }) => !isPublicIp(address))) throw new Error('不允许访问内网图片地址')
}

function isPublicIp(address) {
  const normalized = address.toLowerCase()
  if (normalized.includes(':')) {
    if (normalized.startsWith('::ffff:')) return isPublicIp(normalized.slice(7))
    return normalized !== '::1' && normalized !== '::' && !normalized.startsWith('fc') && !normalized.startsWith('fd') && !normalized.startsWith('fe80:')
  }
  const parts = normalized.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [a, b] = parts
  return a !== 0 && a !== 10 && a !== 127 && a < 224 && !(a === 100 && b >= 64 && b <= 127) && !(a === 169 && b === 254) && !(a === 172 && b >= 16 && b <= 31) && !(a === 192 && b === 168) && !(a === 198 && (b === 18 || b === 19))
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

async function loadImage(src) {
  if (Buffer.isBuffer(src)) return loadCanvasImage(src)
  if (typeof src === 'string' && src.startsWith('data:')) {
    return loadCanvasImage(Buffer.from(src.split(',')[1], 'base64'))
  }
  return loadCanvasImage(src)
}

export function encodeBufferToDataUrl(buf, mime = 'image/png') {
  return `data:${mime};base64,${buf.toString('base64')}`
}
