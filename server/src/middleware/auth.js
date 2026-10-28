import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { HttpError } from '../lib/http.js'
import { getUserById } from '../services/auth.js'

export function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return next(new HttpError(401, '未登录'))
  try {
    const payload = jwt.verify(token, config.jwt.secret)
    req.user = getUserById(payload.sub)
    if (!req.user) return next(new HttpError(401, '用户不存在'))
    next()
  } catch {
    next(new HttpError(401, '登录已过期，请重新登录'))
  }
}

export function adminRequired(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new HttpError(403, '需要管理员权限'))
  }
  next()
}
