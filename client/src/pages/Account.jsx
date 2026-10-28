import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/auth'
import { useToast } from '../components/Toast'
import { Loading, ErrorState } from '../components/States'

const TABS = [
  { key: 'profile', label: '基本信息' },
  { key: 'subscription', label: '订阅状态' },
  { key: 'ledger', label: '额度流水' },
  { key: 'consumption', label: '消费记录' },
]

const TYPE_LABELS = {
  period: '周期额度', topup: '充值', consume: '消耗', refund: '失败返还', adjust: '人工调整',
}

export default function Account() {
  const { user, balance, refreshBalance } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('profile')
  const [ledger, setLedger] = useState(null)
  const [tasks, setTasks] = useState(null)
  const [error, setError] = useState('')
  const [name, setName] = useState(user?.name || '')
  const [canceling, setCanceling] = useState(false)

  useEffect(() => {
    if (tab === 'ledger') {
      api.get('/account/ledger').then(setLedger).catch((e) => setError(e.message))
    } else if (tab === 'consumption') {
      api.get('/account/consumption').then((d) => setTasks(d.tasks)).catch((e) => setError(e.message))
    }
  }, [tab])

  async function saveProfile() {
    try {
      await api.patch('/account/me', { name })
      toast.success('已保存')
      refreshBalance()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function cancelSub() {
    if (!confirm('确定取消续费？当期权益将保留至到期。')) return
    setCanceling(true)
    try {
      await api.post('/account/cancel')
      toast.success('已取消续费')
      refreshBalance()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setCanceling(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-4xl font-extrabold">账户与账单</h1>
      <p className="mt-2 text-white/50">管理个人信息、订阅、额度与消费记录</p>

      {/* 概览卡片 */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-white/40">额度余额</p>
          <p className="mt-1 text-3xl font-extrabold gradient-text">{balance}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-white/40">当前套餐</p>
          <p className="mt-1 text-3xl font-extrabold">{user?.plan === 'free' ? '免费体验' : user?.plan === 'personal' ? '个人版' : user?.plan === 'pro' ? '专业版' : '工作室版'}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-white/40">订阅状态</p>
          <p className="mt-1 text-3xl font-extrabold">
            {user?.subscription_status === 'active' ? '✓ 生效中' : user?.subscription_status === 'canceled' ? '已取消' : '未订阅'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-10 flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${tab === t.key ? 'bg-gradient-brand font-semibold text-ink-950' : 'border border-white/10 bg-white/5 text-white/60'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {error && <ErrorState message={error} />}

        {tab === 'profile' && (
          <div className="card max-w-lg p-6">
            <label className="label" htmlFor="acc-email">邮箱</label>
            <input id="acc-email" className="input" value={user?.email || ''} disabled />
            <label className="label mt-4" htmlFor="acc-name">昵称</label>
            <input id="acc-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
            <button onClick={saveProfile} className="btn-primary mt-5">保存</button>
          </div>
        )}

        {tab === 'subscription' && (
          <div className="card max-w-lg p-6">
            <p className="text-white/60">如需更换套餐或购买额度包，请前往 <a href="/pricing" className="text-brand-cyan hover:underline">价格页</a>。</p>
            {user?.subscription_status === 'active' ? (
              <button onClick={cancelSub} disabled={canceling} className="btn-ghost mt-5 !text-red-300/80">
                {canceling ? '取消中…' : '自助取消续费'}
              </button>
            ) : (
              <p className="mt-4 text-sm text-white/40">当前无生效中的订阅。</p>
            )}
          </div>
        )}

        {tab === 'ledger' && (!ledger ? <Loading /> : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/40">
                  <th className="p-4">类型</th><th className="p-4">变动</th><th className="p-4">余额</th><th className="p-4">备注</th><th className="p-4">时间</th>
                </tr>
              </thead>
              <tbody>
                {ledger.rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="p-4">{TYPE_LABELS[r.type] || r.type}</td>
                    <td className={`p-4 font-semibold ${r.amount >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{r.amount >= 0 ? '+' : ''}{r.amount}</td>
                    <td className="p-4 text-white/60">{r.balance_after}</td>
                    <td className="max-w-[240px] truncate p-4 text-white/40">{r.note}</td>
                    <td className="p-4 text-white/30">{r.created_at?.slice(0, 16).replace('T', ' ')}</td>
                  </tr>
                ))}
                {ledger.rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-white/30">暂无流水</td></tr>}
              </tbody>
            </table>
          </div>
        ))}

        {tab === 'consumption' && (!tasks ? <Loading /> : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/40">
                  <th className="p-4">能力</th><th className="p-4">模型</th><th className="p-4">状态</th><th className="p-4">额度</th><th className="p-4">耗时</th><th className="p-4">时间</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="p-4">{t.capability}</td>
                    <td className="p-4 text-white/60">{t.provider}/{t.model_id}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        t.status === 'succeeded' ? 'bg-emerald-500/15 text-emerald-300'
                        : t.status === 'refunded' ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-white/10 text-white/50'}`}>
                        {t.status === 'succeeded' ? '成功' : t.status === 'refunded' ? '已退款' : t.status === 'failed' ? '失败' : t.status}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-white/80">{t.cost_credits}</td>
                    <td className="p-4 text-white/40">{t.duration_ms ? `${(t.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                    <td className="p-4 text-white/30">{t.created_at?.slice(0, 16).replace('T', ' ')}</td>
                  </tr>
                ))}
                {tasks.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-white/30">暂无消费记录</td></tr>}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
