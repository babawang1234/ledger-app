// 设计底图生成器：用 @napi-rs/canvas 现场生成"虚拟设计背景"（渐变/几何/光晕/网格/波浪等）。
// 与真实摄影图区分——这是"设计师制作好的抽象设计底图"，用于海报留白排版。
// 无需外部服务、无版权风险、可按关键词匹配主题色。

import { createCanvas } from '@napi-rs/canvas'

// 关键词 → 主题色映射（设计底图配色）
const THEME_COLORS = {
  // 环保/自然 → 绿
  '环保': ['#16a34a', '#86efac', '#052e16'],
  '自然': ['#059669', '#a7f3d0', '#022c22'],
  '森林': ['#15803d', '#4ade80', '#052e16'],
  '绿色': ['#22c55e', '#86efac', '#052e16'],
  // 科技 → 蓝紫
  '科技': ['#2563eb', '#6366f1', '#1e1b4b'],
  'AI': ['#4f46e5', '#8b5cf6', '#1e1b4b'],
  '人工智能': ['#6d28d9', '#a78bfa', '#2e1065'],
  '智能': ['#3b82f6', '#60a5fa', '#172554'],
  // 咖啡/美食 → 暖棕
  '咖啡': ['#92400e', '#d97706', '#431407'],
  '美食': ['#ea580c', '#fbbf24', '#431407'],
  '餐饮': ['#dc2626', '#f87171', '#450a0a'],
  '咖啡店': ['#a16207', '#eab308', '#422006'],
  // 金融 → 金
  '金融': ['#b45309', '#facc15', '#422006'],
  '理财': ['#ca8a04', '#fde047', '#3f2d06'],
  // 招聘/商务 → 蓝灰
  '招聘': ['#1d4ed8', '#38bdf8', '#0c1a3a'],
  '商务': ['#334155', '#64748b', '#0f172a'],
  '求职': ['#2563eb', '#7dd3fc', '#0c1a3a'],
  // 医疗/健康 → 青
  '医疗': ['#0891b2', '#67e8f9', '#083344'],
  '健康': ['#0d9488', '#5eead4', '#042f2e'],
  // 美妆 → 粉
  '美妆': ['#db2777', '#f9a8d4', '#500724'],
  '护肤': ['#ec4899', '#fbcfe8', '#500724'],
  // 母婴 → 柔粉
  '母婴': ['#f472b6', '#fbcfe8', '#4a0e2e'],
  '亲子': ['#fb7185', '#fecdd3', '#4c0519'],
  // 教育 → 蓝
  '教育': ['#0369a1', '#7dd3fc', '#082f49'],
  '学习': ['#1e40af', '#93c5fd', '#172554'],
  // 房产 → 蓝灰金
  '房产': ['#1e3a5f', '#93c5fd', '#0b1e33'],
  // 婚庆 → 红金
  '婚庆': ['#dc2626', '#fca5a5', '#450a0a'],
  '婚礼': ['#e11d48', '#fda4af', '#4c0519'],
  // 旅游 → 蓝绿
  '旅游': ['#0284c7', '#5eead4', '#082f49'],
  '旅行': ['#0ea5e9', '#86efac', '#082f49'],
  // 音乐 → 紫
  '音乐': ['#7c3aed', '#c4b5fd', '#2e1065'],
  // 汽车 → 深灰
  '汽车': ['#374151', '#9ca3af', '#111827'],
  // 运动 → 橙
  '运动': ['#ea580c', '#fdba74', '#431407'],
  '健身': ['#f97316', '#fdba74', '#431407'],
  // 宠物 → 暖
  '宠物': ['#f59e0b', '#fde68a', '#451a03'],
  // 节日 → 红
  '节日': ['#dc2626', '#fca5a5', '#450a0a'],
  '春节': ['#dc2626', '#fbbf24', '#450a0a'],
  '春天': ['#16a34a', '#fde047', '#14532d'],
  '冬天': ['#0284c7', '#e0f2fe', '#082f49'],
  // 情人节 / 爱情 → 浪漫暖红粉金（不再落到默认蓝紫）
  '情人节': ['#e11d48', '#fb7185', '#4c0519'],
  '七夕': ['#e11d48', '#f9a8d4', '#4c0519'],
  '520': ['#e11d48', '#fb7185', '#4c0519'],
  '告白': ['#e11d48', '#fb7185', '#4c0519'],
  '爱情': ['#e11d48', '#fb7185', '#4c0519'],
  '恋爱': ['#e11d48', '#f9a8d4', '#4c0519'],
  '玫瑰': ['#dc2626', '#fb7185', '#450a0a'],
  '爱心': ['#e11d48', '#fb7185', '#4c0519'],
  '情侣': ['#e11d48', '#f9a8d4', '#4c0519'],
  '浪漫': ['#db2777', '#f9a8d4', '#500724'],
  // 其他节日
  '圣诞': ['#dc2626', '#86efac', '#1a2e05'],
  '圣诞节': ['#dc2626', '#86efac', '#1a2e05'],
  '中秋': ['#b45309', '#fde68a', '#1c1917'],
  '国庆': ['#dc2626', '#fbbf24', '#450a0a'],
  '母亲节': ['#db2777', '#f9a8d4', '#500724'],
  '父亲节': ['#1d4ed8', '#93c5fd', '#0c1a3a'],
  '感恩': ['#b45309', '#fde68a', '#1c1917'],
  // 艺术
  '艺术': ['#9333ea', '#f472b6', '#2e1065'],
  '设计': ['#6366f1', '#22d3ee', '#1e1b4b'],
}

const DEFAULT_THEME = ['#7c5cff', '#38d9f5', '#1e1b4b']

function pickTheme(keyword) {
  const q = String(keyword || '').toLowerCase()
  for (const [key, colors] of Object.entries(THEME_COLORS)) {
    if (q.includes(key)) return colors
  }
  return DEFAULT_THEME
}

function hexToRgb(hex) {
  const raw = hex.replace('#', '')
  return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)]
}
function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}
function lerpColor(c1, c2, t) {
  const [r1, g1, b1] = hexToRgb(c1)
  const [r2, g2, b2] = hexToRgb(c2)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

// 生成一张"设计底图"PNG，返回 Buffer
export function renderDesignBackdrop({ keyword, width = 1080, height = 1440, variant = 0 }) {
  const [c1, c2, c3] = pickTheme(keyword)
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  // 基底深色
  ctx.fillStyle = c3
  ctx.fillRect(0, 0, width, height)

  // 背景径向渐变光晕
  const cx = width * (0.3 + (variant % 3) * 0.2)
  const cy = height * (0.25 + (variant % 2) * 0.3)
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.8)
  grad.addColorStop(0, rgba(c1, 0.85))
  grad.addColorStop(0.5, rgba(lerpColor(c1, c2, 0.5), 0.5))
  grad.addColorStop(1, rgba(c3, 0.95))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  // 叠加第二光晕
  const cx2 = width * (0.7 - (variant % 3) * 0.1)
  const cy2 = height * (0.7 - (variant % 2) * 0.2)
  const grad2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, width * 0.6)
  grad2.addColorStop(0, rgba(c2, 0.55))
  grad2.addColorStop(1, rgba(c2, 0))
  ctx.fillStyle = grad2
  ctx.fillRect(0, 0, width, height)

  // 根据 variant 绘制不同的几何装饰
  drawDecoration(ctx, width, height, c1, c2, variant)

  // 细微噪点增加质感
  ctx.globalAlpha = 0.04
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000'
    ctx.fillRect(Math.random() * width, Math.random() * height, 1.5, 1.5)
  }
  ctx.globalAlpha = 1

  return canvas.toBuffer('image/png')
}

function drawDecoration(ctx, w, h, c1, c2, variant) {
  const type = variant % 6
  ctx.save()
  switch (type) {
    case 0: // 大圆环
      for (let i = 0; i < 4; i++) {
        const r = h * (0.2 + i * 0.12)
        ctx.beginPath()
        ctx.arc(w * 0.5, h * 0.45, r, 0, Math.PI * 2)
        ctx.strokeStyle = rgba(c2, 0.25 - i * 0.04)
        ctx.lineWidth = 2 + i
        ctx.stroke()
      }
      break
    case 1: // 对角线条纹
      ctx.save()
      ctx.globalAlpha = 0.12
      for (let x = -h; x < w + h; x += 60) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + h, h)
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
      }
      ctx.restore()
      break
    case 2: // 网格
      ctx.globalAlpha = 0.1
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      for (let x = 0; x < w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
      for (let y = 0; y < h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
      break
    case 3: // 波浪
      ctx.globalAlpha = 0.2
      for (let row = 0; row < 6; row++) {
        const y = h * (0.5 + row * 0.1)
        ctx.beginPath()
        ctx.moveTo(0, y)
        for (let x = 0; x <= w; x += 20) {
          ctx.lineTo(x, y + Math.sin(x / 80 + row) * 40)
        }
        ctx.strokeStyle = row % 2 ? rgba(c2, 0.5) : '#ffffff'
        ctx.lineWidth = 2.5
        ctx.stroke()
      }
      break
    case 4: // 大三角几何
      ctx.globalAlpha = 0.15
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(w * 0.5, h * 0.1)
      ctx.lineTo(w * 0.95, h * 0.9)
      ctx.lineTo(w * 0.05, h * 0.9)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 0.12
      ctx.fillStyle = c2
      ctx.beginPath()
      ctx.moveTo(w * 0.5, h * 0.25)
      ctx.lineTo(w * 0.85, h * 0.85)
      ctx.lineTo(w * 0.15, h * 0.85)
      ctx.closePath()
      ctx.fill()
      break
    case 5: // 光点散布
      ctx.globalAlpha = 0.6
      for (let i = 0; i < 30; i++) {
        const r = 2 + Math.random() * 8
        ctx.beginPath()
        ctx.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2)
        ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : c2
        ctx.globalAlpha = 0.2 + Math.random() * 0.4
        ctx.fill()
      }
      break
  }
  ctx.restore()
}

// 生成多张设计底图（不同 variant）
export function generateDesignBackdrops(keyword, { count = 4, width = 1080, height = 1440 } = {}) {
  const backdrops = []
  for (let i = 0; i < count; i++) {
    const buf = renderDesignBackdrop({ keyword, width, height, variant: i })
    backdrops.push({
      id: `design-${Date.now()}-${i}`,
      provider: 'design',
      sourceName: '设计底图',
      description: `${keyword} · 设计背景 ${i + 1}`,
      buffer: buf,
      width,
      height,
      variant: i,
      license: '设计底图 · 可商用',
    })
  }
  return backdrops
}
