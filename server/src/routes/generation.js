import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import { asyncHandler } from '../lib/http.js'
import { createGenerationTask, runTask, taskForUser, listTasks } from '../services/generation.js'
import { modelRegistry } from '../adapters/index.js'
import { currentBalance } from '../services/ledger.js'

const router = Router()
router.use(authRequired)

// 可用模型列表（供工作台展示与手动选择）
router.get(
  '/models',
  asyncHandler(async (req, res) => {
    const { isProviderAvailable } = await import('../adapters/index.js')
    const models = modelRegistry.list({ enabledOnly: true }).map((m) => ({
      id: m.id,
      modelId: m.model_id,
      provider: m.provider,
      displayName: m.display_name,
      capabilities: m.capabilities,
      pricePerUnit: m.price_per_unit,
      unitLabel: m.unit_label,
      estWaitSeconds: m.est_wait_seconds,
      isMock: m.is_mock,
      available: m.is_mock ? true : isProviderAvailable(m.provider),
    }))
    res.json({ models })
  })
)

// 估算额度消耗（生成前展示）
router.post(
  '/estimate',
  asyncHandler(async (req, res) => {
    const { capability, modelId, stockAsset } = req.body
    let model
    if (modelId) {
      model = modelRegistry.get(modelId) || modelRegistry.getByModelId(modelId)
    } else if (stockAsset && ['image_generation', 'image_edit'].includes(capability)) {
      model = modelRegistry.getByModelId('stock-renderer')
    } else {
      const { autoRoute } = await import('../adapters/index.js')
      model = autoRoute(capability || 'text')
    }
    if (!model) return res.status(503).json({ error: 'NO_MODEL', message: '暂无可用模型' })
    const cost = Math.max(1, Math.round(model.price_per_unit))
    res.json({
      model: { id: model.id, displayName: model.display_name, isMock: model.is_mock },
      cost,
      balance: currentBalance(req.user.id),
      estWaitSeconds: model.est_wait_seconds,
    })
  })
)

// 创建生成任务
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { projectId, capability, modelId, params, idempotencyKey } = req.body
    const result = await createGenerationTask({
      userId: req.user.id,
      projectId,
      capability: capability || 'text',
      modelId,
      params,
      idempotencyKey,
    })
    res.status(201).json({ task: result.task, cost: result.cost, model: result.modelRow })
  })
)

// 执行任务（同步运行；生产可改为后台队列 + 轮询）
router.post(
  '/:taskId/run',
  asyncHandler(async (req, res) => {
    const task = taskForUser(req.user.id, req.params.taskId)
    if (!task) return res.status(404).json({ error: 'NOT_FOUND', message: '任务不存在' })
    const result = await runTask(task.id)
    res.json(result)
  })
)

// 任务列表
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ tasks: listTasks(req.user.id, { limit: 100 }) })
  })
)

router.get(
  '/:taskId',
  asyncHandler(async (req, res) => {
    const task = taskForUser(req.user.id, req.params.taskId)
    if (!task) return res.status(404).json({ error: 'NOT_FOUND', message: '任务不存在' })
    res.json({ task })
  })
)

export default router
