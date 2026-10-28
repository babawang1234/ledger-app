import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'

const navItems = [
  { to: '/', label: '首页', end: true },
  { to: '/studio', label: '创作工作台' },
  { to: '/templates', label: '灵感库' },
  { to: '/pricing', label: '价格' },
  { to: '/projects', label: '作品库' },
]

export default function Navbar() {
  const { user, balance, logout } = useAuth()
  const navigate = useNavigate()

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'
    }`

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d9ff72] text-sm font-black text-[#171914] shadow-[0_0_24px_rgba(217,255,114,.22)]">
              NW
            </span>
            <span className="leading-tight"><span className="block text-[11px] font-black tracking-[.16em] text-white">I’M NOT A WORKHORSE</span><span className="mt-0.5 block text-[10px] font-medium tracking-[.12em] text-[#d9ff72]">牛马不加班，设计AI包</span></span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/account"
                className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm sm:flex"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                <span className="font-medium text-white/90">{balance} 额度</span>
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="hidden text-sm text-brand-cyan hover:underline md:block">
                  管理后台
                </Link>
              )}
              <Link
                to="/account"
                className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-brand text-xs font-bold text-ink-950">
                  {(user.name || user.email)[0]?.toUpperCase()}
                </span>
                <span className="hidden max-w-[100px] truncate sm:block">{user.name || user.email}</span>
              </Link>
              <button
                onClick={() => {
                  logout()
                  navigate('/')
                }}
                className="btn-ghost !px-3 !py-1.5 text-sm"
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost !px-4 !py-1.5 text-sm">
                登录
              </Link>
              <Link to="/register" className="btn-primary !px-4 !py-1.5 text-sm">
                免费开始
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 移动端导航：横向滚动，不换行 */}
      <nav className="flex gap-1 overflow-x-auto border-t border-white/5 px-4 py-2 md:hidden [&_a]:whitespace-nowrap [&_a]:px-3 [&_a]:py-1.5">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
            {item.label}
          </NavLink>
        ))}
        {user?.role === 'admin' && (
          <NavLink to="/admin" className={linkClass}>
            管理后台
          </NavLink>
        )}
      </nav>
    </header>
  )
}
