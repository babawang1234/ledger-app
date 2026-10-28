export function Spinner({ className = '' }) {
  return (
    <svg className={`h-5 w-5 animate-spin text-brand-violet ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function Loading({ text = '加载中…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-white/50">
      <Spinner className="h-8 w-8" />
      <p className="text-sm">{text}</p>
    </div>
  )
}

export function EmptyState({ icon = '✨', title = '暂无内容', description = '', action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="text-lg font-semibold text-white/80">{title}</h3>
      {description && <p className="max-w-sm text-sm text-white/40">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message = '加载失败', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 py-16 text-center">
      <div className="text-4xl">⚠️</div>
      <h3 className="text-lg font-semibold text-white/80">{message}</h3>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost text-sm">
          重试
        </button>
      )}
    </div>
  )
}
