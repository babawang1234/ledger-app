import { create } from 'zustand'

export const useToast = create((set) => ({
  toasts: [],
  push(message, type = 'info') {
    const id = Date.now() + Math.random()
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 3500)
  },
  success(msg) {
    this.push(msg, 'success')
  },
  error(msg) {
    this.push(msg, 'error')
  },
}))

export function ToastContainer() {
  const { toasts } = useToast()
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-card backdrop-blur-xl ${
            t.type === 'error'
              ? 'border-red-500/30 bg-red-950/80 text-red-100'
              : t.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-950/80 text-emerald-100'
              : 'border-white/15 bg-ink-800/90 text-white'
          }`}
        >
          <span>{t.type === 'error' ? '✕' : t.type === 'success' ? '✓' : 'ℹ'}</span>
          {t.message}
        </div>
      ))}
    </div>
  )
}
