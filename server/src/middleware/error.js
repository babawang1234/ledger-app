import { HttpError } from '../lib/http.js'

export function notFound(req, res, next) {
  next(new HttpError(404, '资源不存在'))
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500
  const code = err.code || 'INTERNAL_ERROR'
  if (status >= 500) {
    console.error('[ERROR]', err)
  }
  res.status(status).json({
    error: code,
    message: err.message || '服务器内部错误',
    status,
  })
}
