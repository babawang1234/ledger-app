import { Router } from 'express'
import { authRequired, adminRequired } from '../middleware/auth.js'
import { asyncHandler } from '../lib/http.js'
import { modelRegistry } from '../adapters/index.js'
import { listPlans, listCreditPacks, upsertPlan, upsertPack } from '../services/plans.js'
import { db } from '../lib/db.js'
import { adjust } from '../services/ledger.js'

const router = Router()
router.use(authRequired, adminRequired)

// 概览统计
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const users = db.prepare('SELECT COUNT(*) AS c FROM users').get().c
    const projects = db.prepare('SELECT COUNT(*) AS c FROM projects').get().c
    const tasks = db.prepare('SELECT COUNT(*) AS c FROM generation_tasks').get().c
    const succeeded = db.prepare("SELECT COUNT(*) AS c FROM generation_tasks WHERE status='succeeded'").get().c
    const refunded = db.prepare("SELECT COUNT(*) AS c FROM generation_tasks WHERE status='refunded'").get().c
    res.json({ users, projects, tasks, succeeded, refunded })
  })
)

// 用户列表
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const rows = db.prepare('SELECT id, email, name, role, plan, subscription_status, created_at FROM users ORDER BY created_at DESC').all()
    res.json({ users: rows })
  })
)

// 模型管理（列表 + 增改 + 启停）
router.get(
  '/models',
  asyncHandler(async (req, res) => {
    res.json({ models: modelRegistry.list({ enabledOnly: false }) })
  })
)

router.put(
  '/models',
  asyncHandler(async (req, res) => {
    const m = req.body
    if (!m.provider || !m.model_id || !m.display_name) {
      return res.status(400).json({ error: 'VALIDATION', message: 'provider/model_id/display_name 必填' })
    }
    const id = modelRegistry.upsert({
      id: m.id,
      provider: m.provider,
      model_id: m.model_id,
      display_name: m.display_name,
      capabilities: m.capabilities || [],
      price_per_unit: m.price_per_unit ?? 1,
      unit_label: m.unit_label || '次',
      est_wait_seconds: m.est_wait_seconds ?? 30,
      enabled: m.enabled !== false,
      is_mock: m.is_mock ? 1 : 0,
      sort_order: m.sort_order ?? 0,
    })
    res.json({ id, model: modelRegistry.get(id) })
  })
)

router.patch(
  '/models/:id/toggle',
  asyncHandler(async (req, res) => {
    const { enabled } = req.body
    modelRegistry.setEnabled(req.params.id, !!enabled)
    res.json({ id: req.params.id, enabled: !!enabled })
  })
)

// 套餐管理
router.get(
  '/plans',
  asyncHandler(async (req, res) => {
    res.json({ plans: listPlans({ enabledOnly: false }), packs: listCreditPacks({ enabledOnly: false }) })
  })
)

router.put(
  '/plans',
  asyncHandler(async (req, res) => {
    const id = upsertPlan(req.body)
    res.json({ id })
  })
)

router.put(
  '/packs',
  asyncHandler(async (req, res) => {
    const id = upsertPack(req.body)
    res.json({ id })
  })
)

// 人工调整额度
router.post(
  '/ledger/adjust',
  asyncHandler(async (req, res) => {
    const { userId, amount, note } = req.body
    if (!userId || !amount) return res.status(400).json({ error: 'VALIDATION', message: 'userId/amount 必填' })
    const balanceAfter = adjust({ userId, amount: parseInt(amount, 10), refType: 'generation', refId: `manual_${Date.now()}`, note: note || '人工调整' })
    res.json({ balanceAfter })
  })
)

export default router
