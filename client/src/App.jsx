import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
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
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <Admin />
                </RequireAdmin>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
        <ToastContainer />
      </div>
    </BrowserRouter>
  )
}
