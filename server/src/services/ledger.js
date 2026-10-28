import { db } from '../lib/db.js'
import { genId, now } from '../lib/util.js'
import { HttpError } from '../lib/http.js'

/**
 * Credit Ledger 账本服务
 * 类型：period(周期额度) | topup(充值) | consume(消耗) | refund(失败返还) | adjust(人工调整)
 * 实现预扣 → 成功结算 / 失败退款，支持幂等。
 */

export function currentBalance(userId) {
  const row = db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS balance FROM credit_ledger WHERE user_id = ?')
    .get(userId)
  return row.balance
}

function appendLedger({ userId, type, amount, refType, refId, note }) {
  const balanceAfter = currentBalance(userId) + amount
  const id = genId('led')
  db.prepare(
    `INSERT INTO credit_ledger (id, user_id, type, amount, balance_after, ref_type, ref_id, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, type, amount, balanceAfter, refType, refId, note)
  return { id, balanceAfter }
}

/** 预扣（consume 负数）：幂等，通过 idempotencyKey 去重 */
export function preauth({ userId, amount, refType, refId, idempotencyKey, note }) {
  if (idempotencyKey) {
    const existing = db
      .prepare('SELECT * FROM generation_tasks WHERE idempotency_key = ? AND user_id = ?')
      .get(idempotencyKey, userId)
    if (existing) {
      return { idempotent: true, taskId: existing.id, costCredits: existing.cost_credits }
    }
  }
  const balance = currentBalance(userId)
  if (balance < amount) {
    throw new HttpError(402, `额度不足：需要 ${amount}，当前余额 ${balance}`)
  }
  appendLedger({
    userId,
    type: 'consume',
    amount: -amount,
    refType,
    refId,
    note: note || '生成预扣',
  })
  return { idempotent: false, costCredits: amount, balanceAfter: currentBalance(userId) }
}

/** 成功结算：预扣已计入，无需二次扣款；仅记录 task 状态 */
export function settle(userId, refId) {
  // 预扣时已扣减，结算阶段不重复扣款；如需调整在此扩展
  return currentBalance(userId)
}

/** 失败退款：返还额度（refund 正数），幂等 */
export function refund({ userId, amount, refType, refId, note }) {
  // 通过 ref_id 去重，避免重复退款
  const existing = db
    .prepare('SELECT id FROM credit_ledger WHERE ref_id = ? AND type = ?')
    .get(refId, 'refund')
  if (existing) return { idempotent: true }
  appendLedger({ userId, type: 'refund', amount, refType, refId, note: note || '失败返还' })
  return { idempotent: false, balanceAfter: currentBalance(userId) }
}

/** 发放周期额度 */
export function grantPeriod({ userId, amount, refType, refId, note }) {
  appendLedger({ userId, type: 'period', amount, refType, refId, note })
  return currentBalance(userId)
}

/** 充值额度包 */
export function topup({ userId, amount, refType, refId, note }) {
  appendLedger({ userId, type: 'topup', amount, refType, refId, note })
  return currentBalance(userId)
}

/** 人工调整（可正可负） */
export function adjust({ userId, amount, refType, refId, note }) {
  appendLedger({ userId, type: 'adjust', amount, refType, refId, note })
  return currentBalance(userId)
}

export function ledgerFor(userId, { limit = 50, offset = 0 } = {}) {
  const rows = db
    .prepare(
      'SELECT * FROM credit_ledger WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?'
    )
    .all(userId, limit, offset)
  const total = db
    .prepare('SELECT COUNT(*) AS c FROM credit_ledger WHERE user_id = ?')
    .get(userId).c
  return { rows, total, balance: currentBalance(userId) }
}
