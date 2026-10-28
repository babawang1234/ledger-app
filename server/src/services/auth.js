import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../lib/db.js'
import { config } from '../config/index.js'
import { genId, now } from '../lib/util.js'
import { HttpError } from '../lib/http.js'
import { grantPeriod } from './ledger.js'
import { getPlanByKey } from './plans.js'

export function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10)
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  )
}

export function publicUser(u) {
  const { password_hash, ...rest } = u
  return rest
}

export function register({ email, password, name }) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) throw new HttpError(409, '该邮箱已注册')
  const id = genId('usr')
  const hash = hashPassword(password)
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, plan) VALUES (?, ?, ?, ?, 'user', 'free')`
  ).run(id, email, hash, name || email.split('@')[0])

  // 免费体验额度
  const freePlan = getPlanByKey('free')
  const initialCredits = freePlan?.credits_per_period || 10
  grantPeriod({ userId: id, amount: initialCredits, refType: 'subscription', refId: id, note: '新用户免费体验额度' })

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  const token = signToken(user)
  return { token, user: publicUser(user) }
}

export function login({ email, password }) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user) throw new HttpError(401, '邮箱或密码错误')
  if (!bcrypt.compareSync(password, user.password_hash)) throw new HttpError(401, '邮箱或密码错误')
  const token = signToken(user)
  return { token, user: publicUser(user) }
}

export function getUserById(id) {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  return u ? publicUser(u) : null
}

export function updateUser(id, patch) {
  const allowed = ['name']
  const sets = []
  const vals = []
  for (const k of allowed) {
    if (patch[k] !== undefined) {
      sets.push(`${k} = ?`)
      vals.push(patch[k])
    }
  }
  if (sets.length) {
    sets.push(`updated_at = datetime('now')`)
    db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id)
  }
  return getUserById(id)
}
