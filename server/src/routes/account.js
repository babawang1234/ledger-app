import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import { asyncHandler } from '../lib/http.js'
import { getUserById, updateUser } from '../services/auth.js'
import { currentBalance, ledgerFor } from '../services/ledger.js'
import { listPlans, listCreditPacks, subscribe, cancelSubscription } from '../services/plans.js'

const router = Router()
router.use(authRequired)

// 当前用户信息 + 额度余额 + 订阅状态
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const user = getUserById(req.user.id)
    res.json({ user, balance: currentBalance(req.user.id) })
  })
)

router.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const user = updateUser(req.user.id, req.body)
    res.json({ user })
  })
)

// 额度账本流水
router.get(
  '/ledger',
  asyncHandler(async (req, res) => {
    const { limit = 50, offset = 0 } = req.query
    const result = ledgerFor(req.user.id, { limit: parseInt(limit, 10), offset: parseInt(offset, 10) })
    res.json(result)
  })
)

// 消费记录（生成任务）
router.get(
  '/consumption',
  asyncHandler(async (req, res) => {
    const { listTasks } = await import('../services/generation.js')
    const tasks = listTasks(req.user.id, { limit: 100 })
    res.json({ tasks })
  })
)

// 订阅
router.post(
  '/subscribe',
  asyncHandler(async (req, res) => {
    const { planKey } = req.body
    const result = subscribe(req.user.id, planKey)
    res.json(result)
  })
)

router.post(
  '/cancel',
  asyncHandler(async (req, res) => {
    const result = cancelSubscription(req.user.id)
    res.json(result)
  })
)

// 套餐与额度包（公开配置，供价格页展示）
router.get(
  '/plans',
  asyncHandler(async (req, res) => {
    res.json({ plans: listPlans(), packs: listCreditPacks() })
  })
)

export default router
