import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { useToast } from '../components/Toast'

export default function Register() {
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await register(form.email, form.password, form.name)
      toast.success('注册成功，已赠送免费额度')
      navigate('/studio')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold">创建账号</h1>
        <p className="mt-2 text-sm text-white/50">注册即送 20 额度，体验完整创作流程</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="name" className="label">昵称（可选）</label>
            <input id="name" className="input" value={form.name} onChange={set('name')} placeholder="你的昵称" />
          </div>
          <div>
            <label htmlFor="email" className="label">邮箱</label>
            <input id="email" type="email" required autoComplete="email" className="input" value={form.email} onChange={set('email')} placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="password" className="label">密码（至少 6 位）</label>
            <input id="password" type="password" required minLength={6} autoComplete="new-password" className="input" value={form.password} onChange={set('password')} placeholder="••••••••" />
          </div>
          {error && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '创建中…' : '免费开始'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-white/50">
          已有账号？<Link to="/login" className="text-brand-violet hover:underline">直接登录</Link>
        </p>
      </div>
    </div>
  )
}
