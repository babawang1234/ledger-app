import { Router } from 'express'
import { register, login } from '../services/auth.js'
import { asyncHandler } from '../lib/http.js'

const router = Router()

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body
    if (!email || !password) return res.status(400).json({ error: 'VALIDATION', message: '邮箱和密码不能为空' })
    if (password.length < 6) return res.status(400).json({ error: 'VALIDATION', message: '密码至少 6 位' })
    const result = await register({ email, password, name })
    res.json(result)
  })
)

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'VALIDATION', message: '邮箱和密码不能为空' })
    const result = await login({ email, password })
    res.json(result)
  })
)

export default router
