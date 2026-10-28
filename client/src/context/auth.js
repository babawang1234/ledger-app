import { create } from 'zustand'
import { api, setToken } from '../lib/api'

export const useAuth = create((set, get) => ({
  user: null,
  balance: 0,
  initialized: false,
  loading: false,

  async init() {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ initialized: true, user: null })
      return
    }
    try {
      const { user, balance } = await api.get('/account/me')
      set({ user, balance, initialized: true })
    } catch {
      setToken('')
      set({ user: null, balance: 0, initialized: true })
    }
  },

  async login(email, password) {
    const { token, user } = await api.post('/auth/login', { email, password })
    setToken(token)
    const { balance } = await api.get('/account/me')
    set({ user, balance })
    return user
  },

  async register(email, password, name) {
    const { token, user } = await api.post('/auth/register', { email, password, name })
    setToken(token)
    const { balance } = await api.get('/account/me')
    set({ user, balance })
    return user
  },

  logout() {
    setToken('')
    set({ user: null, balance: 0 })
  },

  async refreshBalance() {
    try {
      const { balance } = await api.get('/account/me')
      set({ balance })
    } catch {}
  },
}))
