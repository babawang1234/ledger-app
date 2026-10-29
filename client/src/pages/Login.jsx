import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { useToast } from '../components/Toast'

export default function Login() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const from = location.state?.from?.pathname || '/studio'

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      toast.success('登录成功')
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold">登录</h1>
        <p className="mt-2 text-sm text-white/50">欢迎回来，继续你的创作</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="label">邮箱</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="label">密码</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '登录中…' : '登录'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-white/50">
          还没有账号？<Link to="/register" className="text-brand-violet hover:underline">免费注册</Link>
        </p>
        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-center text-xs text-white/40">
          演示账号：demo@example.com / demo123456
        </div>
        <div className="mt-3 text-center">
          <Link
            to="/admin/demo"
            className="text-sm font-medium text-brand-violet hover:underline"
          >
            一键进入管理后台（免登录）
          </Link>
        </div>
      </div>
    </div>
  )
}
