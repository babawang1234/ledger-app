export default function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-card"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white" aria-label="关闭">
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-white/10 px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}
