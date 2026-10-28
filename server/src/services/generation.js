import { db } from '../lib/db.js'
import { genId, now } from '../lib/util.js'
import { HttpError } from '../lib/http.js'
import { autoRoute, routeById, invoke } from '../adapters/index.js'
import * as ledger from './ledger.js'
import { generateLayouts } from '../lib/layouts.js'
import { renderPoster, encodeBufferToDataUrl } from '../lib/renderer.js'
import fs from 'fs'
import path from 'path'
import { config } from '../config/index.js'
import { makeArtPrompt, validatePosterBrief } from '../skills/poster/index.js'

/**
 * 生成服务：编排模型调用 + 额度账本 + 排版渲染。
 * 流程：预扣额度 → 调用模型 → 生成版式 → 渲染 → 成功结算 / 失败退款。
 */

function estimateCost(modelRow) {
  // 生成任务成本 = 模型单价（额度），一次生成多个方案可配置倍率
  return Math.max(1, Math.round(modelRow.price_per_unit))
}

async function persistGeneratedArtwork(result) {
  let bytes
  let mime = 'image/png'
  if (result?.b64_json) {
    bytes = Buffer.from(result.b64_json, 'base64')
  } else if (result?.dataUrl?.startsWith('data:')) {
    const match = result.dataUrl.match(/^data:(image\/[\w.+-]+);base64,(.+)$/s)
    if (match) {
      mime = match[1]
      bytes = Buffer.from(match[2], 'base64')
    }
  } else if (result?.url && /^https:\/\//i.test(result.url)) {
    const response = await fetch(result.url)
    if (!response.ok) throw new Error(`无法保存模型生成图片（HTTP ${response.status}）`)
    mime = response.headers.get('content-type')?.split(';')[0] || mime
    bytes = Buffer.from(await response.arrayBuffer())
  }
  if (!bytes?.length) return null
  if (!mime.startsWith('image/')) throw new Error('图像模型返回了非图片文件')
  const extension = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png'
  const publicDir = path.resolve(config.exportDir, '../public/generated')
  fs.mkdirSync(publicDir, { recursive: true })
  const filename = `${genId('art')}.${extension}`
  fs.writeFileSync(path.join(publicDir, filename), bytes)
  return `/generated/${filename}`
}

function resolveUploadedImage(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) return undefined
  const filename = path.basename(url)
  if (!filename || filename === '.' || filename === '..') return undefined
  const filePath = path.resolve(config.uploadDir, filename)
  return filePath.startsWith(`${path.resolve(config.uploadDir)}${path.sep}`) && fs.existsSync(filePath)
    ? filePath
    : undefined
}

export async function createGenerationTask({
  userId,
  projectId,
  capability,
  modelId, // 可选，手动指定；不传则自动路由
  params,
  idempotencyKey,
}) {
  let modelRow
  if (!modelId && params?.stockAsset && ['image_generation', 'image_edit'].includes(capability)) {
    modelRow = routeById('stock-renderer', capability)
  } else if (modelId) {
    modelRow = routeById(modelId, capability)
  } else {
    modelRow = autoRoute(capability)
    if (!modelRow) throw new HttpError(503, '暂无可用的模型，请联系管理员配置')
  }

  const cost = estimateCost(modelRow)

  // 幂等预扣
  const pre = ledger.preauth({
    userId,
    amount: cost,
    refType: 'generation',
    refId: null,
    idempotencyKey,
    note: `生成任务预扣 · ${modelRow.display_name}`,
  })
  if (pre.idempotent) {
    // 已有相同幂等键的任务，直接返回
    const task = db.prepare('SELECT * FROM generation_tasks WHERE id = ?').get(pre.taskId)
    return task
  }

  const taskId = genId('task')
  db.prepare(
    `INSERT INTO generation_tasks
      (id, user_id, project_id, model_id, provider, capability, params, status, cost_credits, idempotency_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`
  ).run(
    taskId,
    userId,
    projectId || null,
    modelRow.id,
    modelRow.provider,
    capability,
    JSON.stringify(params || {}),
    cost,
    idempotencyKey || null,
    now()
  )

  const task = db.prepare('SELECT * FROM generation_tasks WHERE id = ?').get(taskId)
  return { taskId, task, modelRow, cost }
}

/** 同步执行任务（MVP 采用进程内队列，可替换为独立 worker） */
export async function runTask(taskId) {
  const task = db.prepare('SELECT * FROM generation_tasks WHERE id = ?').get(taskId)
  if (!task) throw new HttpError(404, '任务不存在')

  const modelRow = db.prepare('SELECT * FROM models WHERE id = ?').get(task.model_id)
  const started = Date.now()
  db.prepare(`UPDATE generation_tasks SET status='running', started_at=? WHERE id=?`).run(now(), taskId)

  try {
    const params = JSON.parse(task.params)
    const briefIssues = ['image_generation', 'image_edit'].includes(task.capability)
      ? validatePosterBrief({ content: params.content, canvas: { width: params.width, height: params.height } })
      : []
    if (briefIssues.length) throw new HttpError(400, `海报信息检查未通过：${briefIssues.join('；')}`)
    const stockAsset = params.stockAsset || null
    const imagePrompt = ['image_generation', 'image_edit'].includes(task.capability)
      ? makeArtPrompt({ ...params, stockAsset })
      : params.prompt
    const result = await invoke(modelRow, task.capability, {
      model: modelRow.model_id,
      prompt: imagePrompt,
      system: params.system,
      imagePath: resolveUploadedImage(params.imageUrl),
      width: params.width,
      height: params.height,
      purpose: params.purpose,
      content: params.content,
      styleAnalysis: params.styleAnalysis,
      referencePath: resolveUploadedImage(params.referenceUrl),
      stockAsset,
    })

    const generatedArtwork = ['image_generation', 'image_edit'].includes(task.capability)
      ? (await persistGeneratedArtwork(result) || (modelRow.provider === 'stock' ? stockAsset?.url : null))
      : null

    // 生成 3-4 个版式方案（排版引擎）
    const layouts = generateLayouts({
      content: params.content || {},
      purpose: params.purpose || '',
      canvas: { width: params.width || 1080, height: params.height || 1920 },
      styleAnalysis: params.styleAnalysis,
      artwork: generatedArtwork,
      stockAsset,
    })

    // 渲染缩略图
    const thumbnails = []
    for (const l of layouts) {
      const buf = await renderPoster({ width: l.canvas.width, height: l.canvas.height, background: l.background, layers: l.layers })
      thumbnails.push(encodeBufferToDataUrl(buf))
    }

    const duration = Date.now() - started
    ledger.settle(task.user_id, task.id)
    db.prepare(
      `UPDATE generation_tasks SET status='succeeded', finished_at=?, duration_ms=?, params=? WHERE id=?`
    ).run(now(), duration, JSON.stringify({ ...params, mock: !!result.mock }), taskId)

    return {
      taskId,
      status: 'succeeded',
      mock: !!result.mock,
      output: result.content ?? null,
      model: modelRow,
      layouts,
      thumbnails,
      cost: task.cost_credits,
      duration,
    }
  } catch (err) {
    const duration = Date.now() - started
    // 失败退款（幂等）
    ledger.refund({
      userId: task.user_id,
      amount: task.cost_credits,
      refType: 'generation',
      refId: task.id,
      note: `生成失败退款 · ${err.message}`,
    })
    db.prepare(
      `UPDATE generation_tasks SET status='refunded', error=?, finished_at=?, duration_ms=? WHERE id=?`
    ).run(err.message.slice(0, 500), now(), duration, taskId)
    throw err
  }
}

export function taskForUser(userId, taskId) {
  return db.prepare('SELECT * FROM generation_tasks WHERE id = ? AND user_id = ?').get(taskId, userId)
}

export function listTasks(userId, { limit = 50, offset = 0 } = {}) {
  const rows = db
    .prepare('SELECT * FROM generation_tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(userId, limit, offset)
  return rows.map((r) => ({ ...r, params: JSON.parse(r.params || '{}') }))
}

/** 保存版式到项目 */
export function saveLayout({ projectId, userId, name, layers, canvas, background, styleAnalysis, thumbnailPath }) {
  const id = genId('layout')
  db.prepare(
    `INSERT INTO layouts (id, project_id, user_id, name, layers, canvas, background, style_analysis, thumbnail_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    projectId,
    userId,
    name,
    JSON.stringify(layers),
    JSON.stringify(canvas),
    JSON.stringify(background || {}),
    styleAnalysis ? JSON.stringify(styleAnalysis) : null,
    thumbnailPath || null
  )
  return getLayout(userId, id)
}

export function getLayout(userId, layoutId) {
  const l = db.prepare('SELECT * FROM layouts WHERE id = ? AND user_id = ?').get(layoutId, userId)
  if (!l) return null
  return {
    ...l,
    layers: JSON.parse(l.layers || '[]'),
    canvas: JSON.parse(l.canvas || '{}'),
    background: JSON.parse(l.background || '{}'),
    style_analysis: l.style_analysis ? JSON.parse(l.style_analysis) : null,
  }
}

export function listLayouts(userId, projectId) {
  return db
    .prepare('SELECT * FROM layouts WHERE user_id = ? AND project_id = ? ORDER BY created_at DESC')
    .all(userId, projectId)
    .map((l) => ({
      ...l,
      layers: JSON.parse(l.layers || '[]'),
      canvas: JSON.parse(l.canvas || '{}'),
    }))
}

export function updateLayout(userId, layoutId, { layers, canvas, background, name }) {
  const l = getLayout(userId, layoutId)
  if (!l) throw new HttpError(404, '版式不存在')
  db.prepare(
    `UPDATE layouts SET layers=?, canvas=?, background=?, name=?, version=version+1, updated_at=datetime('now') WHERE id=?`
  ).run(
    JSON.stringify(layers ?? l.layers),
    JSON.stringify(canvas ?? l.canvas),
    JSON.stringify(background ?? l.background),
    name ?? l.name,
    layoutId
  )
  return getLayout(userId, layoutId)
}

/** 导出 PNG/JPG 并记录历史 */
export async function exportLayout({ userId, projectId, layoutId, format = 'png', sizeLabel, scale = 1 }) {
  const layout = getLayout(userId, layoutId)
  if (!layout) throw new HttpError(404, '版式不存在')
  const { width, height } = layout.canvas
  const outW = Math.round(width * scale)
  const outH = Math.round(height * scale)

  const layers = layout.layers.map((l) => {
    if (l.type === 'image' && l.localPath) return l
    return l
  })

  const buf = await renderPoster({
    width: outW,
    height: outH,
    background: layout.background || { color: '#0a0a14' },
    layers,
  })

  const ext = format === 'jpg' ? 'jpg' : 'png'
  const filename = `${genId('export')}.${ext}`
  fs.mkdirSync(config.exportDir, { recursive: true })
  const filePath = path.join(config.exportDir, filename)

  if (format === 'jpg') {
    // PNG buffer 转 JPG：使用 canvas 重绘
    const { createCanvas, Image } = await import('@napi-rs/canvas')
    const c = createCanvas(outW, outH)
    const ctx = c.getContext('2d')
    const img = new Image()
    img.src = buf
    ctx.drawImage(img, 0, 0, outW, outH)
    fs.writeFileSync(filePath, c.toBuffer('image/jpeg', 0.92))
  } else {
    fs.writeFileSync(filePath, buf)
  }

  const id = genId('export')
  db.prepare(
    `INSERT INTO exports (id, user_id, project_id, layout_id, format, size_label, file_path, width, height)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, projectId, layoutId, format, sizeLabel, `/exports/${filename}`, outW, outH)

  return { id, format, sizeLabel, url: `/exports/${filename}`, width: outW, height: outH }
}

export function listExports(userId, { limit = 100, offset = 0 } = {}) {
  return db
    .prepare('SELECT * FROM exports WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(userId, limit, offset)
}
