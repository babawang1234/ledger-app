import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from './context/auth'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import { ToastContainer } from './components/Toast.jsx'
import { Loading } from './components/States.jsx'

import Home from './pages/Home.jsx'
import Studio from './pages/Studio.jsx'
import Templates from './pages/Templates.jsx'
import Pricing from './pages/Pricing.jsx'
import Projects from './pages/Projects.jsx'
import Account from './pages/Account.jsx'
import Admin from './pages/Admin.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'

function RequireAuth({ children }) {
  const { user, initialized } = useAuth()
  const location = useLocation()
  if (!initialized) return <Loading text="正在加载…" />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function RequireAdmin({ children }) {
  const { user, initialized } = useAuth()
  if (!initialized) return <Loading text="正在加载…" />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

// 免登录演示入口：自动用内置 admin 账号静默登录后进入管理后台
function AdminDemo() {
  const { user, login } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (user?.role === 'admin') return // 已是管理员，直接放行
      try {
        await login('admin@example.com', 'admin123456')
      } catch (e) {
        if (!cancelled) setError(e.message || '免登录失败，请改用管理员账号手动登录')
      }
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <Navigate to="/login" replace />
  if (!user || user.role !== 'admin') return <Loading text="正在进入管理后台…" />
  return <Navigate to="/admin" replace />
}

export default function App() {
  const { init } = useAuth()
  useEffect(() => {
    init()
  }, [])

  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-ink-950">
        <div className="pointer-events-none fixed inset-0 bg-gradient-glow" aria-hidden />
        <Navbar />
        <main className="relative flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/studio"
              element={
                <RequireAuth>
                  <Studio />
                </RequireAuth>
              }
            />
            <Route
              path="/studio/:projectId"
              element={
                <RequireAuth>
                  <Studio />
                </RequireAuth>
              }
            />
            <Route
              path="/projects"
              element={
                <RequireAuth>
                  <Projects />
                </RequireAuth>
              }
            />
            <Route
              path="/account"
              element={
                <RequireAuth>
                  <Account />
                </RequireAuth>
              }
            />
            <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
            <Route path="/admin/demo" element={<AdminDemo />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
        <ToastContainer />
      </div>
    </BrowserRouter>
  )
}
