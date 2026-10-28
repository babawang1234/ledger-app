import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink-950/60">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d9ff72] text-sm font-black text-[#171914]">
                NW
              </span>
              <span className="text-xs font-black tracking-[.12em] text-white">I’M NOT A WORKHORSE</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-white/50">牛马不加班，设计AI包。给独立设计师的 AI 海报创作工作台。</p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white/80">产品</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li><Link to="/studio" className="transition hover:text-white">创作工作台</Link></li>
              <li><Link to="/templates" className="transition hover:text-white">灵感库</Link></li>
              <li><Link to="/pricing" className="transition hover:text-white">价格方案</Link></li>
              <li><Link to="/projects" className="transition hover:text-white">作品库</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white/80">账户</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li><Link to="/account" className="transition hover:text-white">账户与账单</Link></li>
              <li><Link to="/login" className="transition hover:text-white">登录</Link></li>
              <li><Link to="/register" className="transition hover:text-white">免费注册</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-white/5 pt-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()} I’M NOT A WORKHORSE · 牛马不加班，设计AI包
        </div>
      </div>
    </footer>
  )
}
