import { db } from '../lib/db.js'
import { genId } from '../lib/util.js'
import { HttpError } from '../lib/http.js'

export function listPlans({ enabledOnly = true } = {}) {
  const rows = db
    .prepare(
      `SELECT * FROM plans ${enabledOnly ? 'WHERE enabled = 1' : ''} ORDER BY sort_order, price_monthly`
    )
    .all()
  return rows.map((p) => ({
    ...p,
    enabled: !!p.enabled,
    features: JSON.parse(p.features || '[]'),
  }))
}

export function listCreditPacks({ enabledOnly = true } = {}) {
  const rows = db
    .prepare(`SELECT * FROM credit_packs ${enabledOnly ? 'WHERE enabled = 1' : ''} ORDER BY price`)
    .all()
  return rows.map((p) => ({ ...p, enabled: !!p.enabled }))
}

export function getPlanByKey(key) {
  const row = db.prepare('SELECT * FROM plans WHERE key = ?').get(key)
  if (!row) return null
  return { ...row, enabled: !!row.enabled, features: JSON.parse(row.features || '[]') }
}

export function upsertPlan(plan) {
  const existing = db.prepare('SELECT id FROM plans WHERE key = ?').get(plan.key)
  if (existing) {
    db.prepare(
      `UPDATE plans SET name=@name, price_monthly=@price_monthly, credits_per_period=@credits_per_period,
        export_quality=@export_quality, model_tier=@model_tier, team_seats=@team_seats,
        features=@features, enabled=@enabled, sort_order=@sort_order WHERE id=@id`
    ).run({ ...plan, features: JSON.stringify(plan.features || []), id: existing.id })
    return existing.id
  }
  const id = plan.id || genId('plan')
  db.prepare(
    `INSERT INTO plans (id, key, name, price_monthly, credits_per_period, export_quality, model_tier, team_seats, features, enabled, sort_order)
     VALUES (@id, @key, @name, @price_monthly, @credits_per_period, @export_quality, @model_tier, @team_seats, @features, @enabled, @sort_order)`
  ).run({ ...plan, id, features: JSON.stringify(plan.features || []) })
  return id
}

export function upsertPack(pack) {
  const existing = db.prepare('SELECT id FROM credit_packs WHERE key = ?').get(pack.key)
  if (existing) {
    db.prepare(
      'UPDATE credit_packs SET name=@name, credits=@credits, price=@price, enabled=@enabled WHERE id=@id'
    ).run({ ...pack, id: existing.id })
    return existing.id
  }
  const id = pack.id || genId('pack')
  db.prepare(
    `INSERT INTO credit_packs (id, key, name, credits, price, enabled) VALUES (@id, @key, @name, @credits, @price, @enabled)`
  ).run({ ...pack, id })
  return id
}

export function subscribe(userId, planKey) {
  const plan = getPlanByKey(planKey)
  if (!plan || !plan.enabled) throw new HttpError(400, '套餐不存在或已下架')
  db.prepare(
    `UPDATE users SET plan=?, subscription_status='active', updated_at=datetime('now') WHERE id=?`
  ).run(planKey, userId)
  return { plan: planKey, status: 'active' }
}

export function cancelSubscription(userId) {
  db.prepare(
    `UPDATE users SET subscription_status='canceled', updated_at=datetime('now') WHERE id=?`
  ).run(userId)
  return { status: 'canceled' }
}
