// 设计底图生成器：用 @napi-rs/canvas 现场生成"虚拟设计背景"。
// 与真实摄影图区分——这是"设计师制作好的抽象设计底图"，用于海报留白排版。
// 无需外部服务、无版权风险、可按关键词匹配主题色。
// 本版本引入多种高级设计风格：流体渐变、孟菲斯拼贴、弥散光晕、噪点纹理、
// 几何构图、网格大字、双色渐变、同心圆射线等，摆脱"纯渐变太简单"的观感。

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
  // 水厂 / 工厂 / 工业 → 青蓝工业风（不再是默认蓝紫，且区别于"水"的海洋蓝）
  '水厂': ['#0891b2', '#67e8f9', '#0c1a2e'],
  '净水': ['#0ea5e9', '#a5f3fc', '#082f49'],
  '水处理': ['#0284c7', '#7dd3fc', '#082f49'],
  '污水处理': ['#0e7490', '#a5f3fc', '#0c1a2e'],
  '水务': ['#0891b2', '#67e8f9', '#0c1a2e'],
  '工厂': ['#475569', '#94a3b8', '#0f172a'],
  '工业': ['#334155', '#64748b', '#0f172a'],
  '制造': ['#475569', '#cbd5e1', '#0f172a'],
  '车间': ['#475569', '#94a3b8', '#0f172a'],
  // 茶 / 奶茶 → 暖棕青绿（茶香雅致，区别于咖啡的深棕）
  '茶': ['#0f766e', '#a7f3d0', '#0c1a1a'],
  '茶叶': ['#15803d', '#bbf7d0', '#052e16'],
  '龙井': ['#16a34a', '#bbf7d0', '#052e16'],
  '绿茶': ['#16a34a', '#bbf7d0', '#052e16'],
  '红茶': ['#b45309', '#fcd34d', '#3f1d0a'],
  '奶茶': ['#c77b30', '#f5d0a9', '#3a2412'],
  '茶饮': ['#0f766e', '#a7f3d0', '#0c1a1a'],
  // 火锅 / 美食 → 暖红橙（麻辣热烈）
  '火锅': ['#dc2626', '#fb923c', '#450a0a'],
  '麻辣': ['#dc2626', '#fb923c', '#450a0a'],
  // 马拉松 / 跑步 → 活力橙红
  '马拉松': ['#ea580c', '#fdba74', '#431407'],
  '跑步': ['#ea580c', '#fdba74', '#431407'],
  // 鲜花 → 粉紫
  '鲜花': ['#db2777', '#f9a8d4', '#500724'],
  '花': ['#ec4899', '#fbcfe8', '#500724'],
  // 春节 / 新年 / 国风 → 红金
  '春节': ['#dc2626', '#fbbf24', '#450a0a'],
  '新年': ['#dc2626', '#fbbf24', '#450a0a'],
  '国风': ['#b91c1c', '#fbbf24', '#1c1917'],
  '端午': ['#16a34a', '#fde047', '#14532d'],
  '中秋': ['#b45309', '#fde68a', '#1c1917'],
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

// 生成一张"设计底图"PNG，返回 Buffer。
// 用 variant 切换 8 种差异明显的高级设计风格。
export function renderDesignBackdrop({ keyword, width = 1080, height = 1440, variant = 0 }) {
  const [c1, c2, c3] = pickTheme(keyword)
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  const style = variant % 8
  switch (style) {
    case 0: renderFluidGradient(ctx, width, height, c1, c2, c3); break
    case 1: renderMemphis(ctx, width, height, c1, c2, c3); break
    case 2: renderDiffuseGlow(ctx, width, height, c1, c2, c3); break
    case 3: renderGeometric(ctx, width, height, c1, c2, c3); break
    case 4: renderDiagonal(ctx, width, height, c1, c2, c3); break
    case 5: renderConcentric(ctx, width, height, c1, c2, c3); break
    case 6: renderDuotone(ctx, width, height, c1, c2, c3); break
    case 7: renderAurora(ctx, width, height, c1, c2, c3); break
  }

  // 统一叠加细微噪点，增加质感
  addGrain(ctx, width, height, 0.035)

  return canvas.toBuffer('image/png')
}

// —— 8 种设计风格 ——

// 0 流体渐变：多层柔和径向光晕，高级弥散
function renderFluidGradient(ctx, w, h, c1, c2, c3) {
  ctx.fillStyle = c3
  ctx.fillRect(0, 0, w, h)
  const blobs = [
    { x: 0.28, y: 0.24, r: 0.75, c: c1, a: 0.9 },
    { x: 0.76, y: 0.42, r: 0.7, c: c2, a: 0.7 },
    { x: 0.35, y: 0.78, r: 0.7, c: lerpColor(c1, c2, 0.4), a: 0.65 },
    { x: 0.72, y: 0.85, r: 0.5, c: c1, a: 0.4 },
  ]
  for (const b of blobs) {
    const r = Math.max(w, h) * b.r
    const g = ctx.createRadialGradient(w * b.x, h * b.y, 0, w * b.x, h * b.y, r)
    g.addColorStop(0, rgba(b.c, b.a))
    g.addColorStop(1, rgba(b.c, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
}

// 1 孟菲斯拼贴：色块 + 圆点 + 三角 + 曲线，活泼设计感
function renderMemphis(ctx, w, h, c1, c2, c3) {
  ctx.fillStyle = c3
  ctx.fillRect(0, 0, w, h)
  // 大色块
  ctx.fillStyle = rgba(c1, 0.9)
  ctx.fillRect(0, 0, w * 0.42, h * 0.55)
  ctx.fillStyle = rgba(c2, 0.75)
  ctx.fillRect(w * 0.62, h * 0.18, w * 0.38, h * 0.4)
  // 圆点
  for (const [px, py, pr, pc] of [
    [0.55, 0.12, 0.06, c1], [0.85, 0.08, 0.035, '#ffffff'],
    [0.18, 0.68, 0.05, c2], [0.48, 0.82, 0.04, '#ffffff'],
  ]) {
    ctx.beginPath(); ctx.arc(w * px, h * py, w * pr, 0, Math.PI * 2)
    ctx.fillStyle = rgba(pc, 0.9); ctx.fill()
  }
  // 波浪曲线
  ctx.strokeStyle = rgba('#ffffff', 0.7)
  ctx.lineWidth = Math.max(4, w * 0.01)
  ctx.beginPath()
  for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * 0.7 + Math.sin(x / 90) * h * 0.06)
  ctx.stroke()
  // 三角
  ctx.fillStyle = rgba(c1, 0.85)
  ctx.beginPath(); ctx.moveTo(w * 0.8, h * 0.7); ctx.lineTo(w * 0.98, h * 0.7); ctx.lineTo(w * 0.89, h * 0.5); ctx.closePath(); ctx.fill()
}

// 2 弥散光晕：大面积柔和光斑，梦幻
function renderDiffuseGlow(ctx, w, h, c1, c2, c3) {
  ctx.fillStyle = c3
  ctx.fillRect(0, 0, w, h)
  const glows = [
    { x: 0.5, y: 0.35, r: 0.9, c: c1, a: 0.55 },
    { x: 0.2, y: 0.7, r: 0.6, c: c2, a: 0.4 },
    { x: 0.82, y: 0.65, r: 0.55, c: c1, a: 0.35 },
    { x: 0.45, y: 0.15, r: 0.5, c: c2, a: 0.3 },
  ]
  for (const g of glows) {
    const r = Math.max(w, h) * g.r
    const gr = ctx.createRadialGradient(w * g.x, h * g.y, 0, w * g.x, h * g.y, r)
    gr.addColorStop(0, rgba(g.c, g.a))
    gr.addColorStop(1, rgba(g.c, 0))
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h)
  }
}

// 3 几何构图：大圆环 + 交叠矩形 + 对角线
function renderGeometric(ctx, w, h, c1, c2, c3) {
  ctx.fillStyle = c3
  ctx.fillRect(0, 0, w, h)
  // 同心圆环
  for (let i = 0; i < 5; i++) {
    const r = h * (0.14 + i * 0.1)
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.42, r, 0, Math.PI * 2)
    ctx.strokeStyle = rgba(i % 2 ? c1 : c2, 0.5 - i * 0.07)
    ctx.lineWidth = 2 + i * 1.2
    ctx.stroke()
  }
  // 交叠半透明矩形
  ctx.globalAlpha = 0.5
  ctx.fillStyle = c1
  ctx.fillRect(w * 0.08, h * 0.6, w * 0.3, h * 0.28)
  ctx.globalAlpha = 0.4
  ctx.fillStyle = c2
  ctx.fillRect(w * 0.28, h * 0.68, w * 0.32, h * 0.28)
  ctx.globalAlpha = 1
  // 对角线
  ctx.strokeStyle = rgba('#ffffff', 0.2); ctx.lineWidth = w * 0.006
  ctx.beginPath(); ctx.moveTo(0, h * 0.85); ctx.lineTo(w, h * 0.45); ctx.stroke()
}

// 4 对角分割 + 斜纹
function renderDiagonal(ctx, w, h, c1, c2, c3) {
  ctx.fillStyle = c3; ctx.fillRect(0, 0, w, h)
  ctx.save()
  ctx.rotate(-0.35)
  ctx.fillStyle = c1
  ctx.fillRect(-w * 0.3, h * 0.1, w * 1.4, h * 0.3)
  ctx.fillStyle = c2
  ctx.fillRect(-w * 0.3, h * 0.55, w * 1.4, h * 0.28)
  ctx.restore()
  // 细斜纹
  ctx.save(); ctx.globalAlpha = 0.15; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2
  for (let x = -h; x < w + h; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke()
  }
  ctx.restore()
}

// 5 同心圆射线：从中心扩散的弧线，科技感
function renderConcentric(ctx, w, h, c1, c2, c3) {
  ctx.fillStyle = c3; ctx.fillRect(0, 0, w, h)
  const cx = w * 0.5, cy = h * 0.42
  for (let i = 0; i < 14; i++) {
    const r = 20 + i * (Math.max(w, h) * 0.045)
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = rgba(i % 2 ? c1 : c2, Math.max(0.12, 0.55 - i * 0.03))
    ctx.lineWidth = 1.5 + (i % 3)
    ctx.stroke()
  }
  // 中心光点
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.3)
  g.addColorStop(0, rgba(c1, 0.7)); g.addColorStop(1, rgba(c1, 0))
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
}

// 6 双色调：上下两个大色域硬切 + 过渡带
function renderDuotone(ctx, w, h, c1, c2, c3) {
  ctx.fillStyle = c3; ctx.fillRect(0, 0, w, h)
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, c1); g.addColorStop(0.5, lerpColor(c1, c2, 0.5)); g.addColorStop(1, c3)
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  // 半透明圆形叠加
  ctx.globalAlpha = 0.3
  ctx.fillStyle = '#ffffff'
  ctx.beginPath(); ctx.arc(w * 0.72, h * 0.3, w * 0.28, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 0.22
  ctx.beginPath(); ctx.arc(w * 0.25, h * 0.72, w * 0.24, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1
}

// 7 极光：多层弯曲色带，梦幻流线
function renderAurora(ctx, w, h, c1, c2, c3) {
  ctx.fillStyle = c3; ctx.fillRect(0, 0, w, h)
  for (let band = 0; band < 4; band++) {
    const yBase = h * (0.2 + band * 0.18)
    ctx.beginPath()
    for (let x = 0; x <= w; x += 6) {
      const y = yBase + Math.sin(x / (140 + band * 30) + band * 1.5) * h * 0.06
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.strokeStyle = rgba(band % 2 ? c1 : c2, 0.5 - band * 0.09)
    ctx.lineWidth = 18 - band * 2
    ctx.stroke()
  }
}

// 噪点纹理
function addGrain(ctx, w, h, alpha) {
  ctx.globalAlpha = alpha
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000'
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5)
  }
  ctx.globalAlpha = 1
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
