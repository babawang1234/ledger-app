import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'
import { Loading, ErrorState } from '../components/States'

const TABS = [
  { key: 'stats', label: '概览' },
  { key: 'models', label: '模型管理' },
  { key: 'plans', label: '套餐配置' },
  { key: 'users', label: '用户' },
]

const CAP_OPTIONS = ['text', 'image_input', 'image_generation', 'image_edit']

export default function Admin() {
  const toast = useToast()
  const [tab, setTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [models, setModels] = useState(null)
  const [plans, setPlans] = useState(null)
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [adjust, setAdjust] = useState({ userId: '', amount: '', note: '' })

  async function load() {
    try {
      setError('')
      const [s, m, p, u] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/models'),
        api.get('/admin/plans'),
        api.get('/admin/users'),
      ])
      setStats(s); setModels(m.models); setPlans(p); setUsers(u.users)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [])

  async function toggleModel(m) {
    try {
      await api.patch(`/admin/models/${m.id}/toggle`, { enabled: !m.enabled })
      toast.success(`已${m.enabled ? '停用' : '启用'} ${m.display_name}`)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function saveModel() {
    try {
      await api.put('/admin/models', {
        ...editing,
        capabilities: editing.capabilities || [],
        price_per_unit: parseFloat(editing.price_per_unit) || 1,
        est_wait_seconds: parseInt(editing.est_wait_seconds, 10) || 30,
      })
      toast.success('模型已保存')
      setEditing(null)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function savePlan(p) {
    try {
      await api.put('/admin/plans', { ...p, price_monthly: parseFloat(p.price_monthly) || 0, credits_per_period: parseInt(p.credits_per_period, 10) || 0 })
      toast.success('套餐已保存')
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function submitAdjust() {
    try {
      const d = await api.post('/admin/ledger/adjust', adjust)
      toast.success(`调整成功，余额现为 ${d.balanceAfter}`)
      setAdjust({ userId: '', amount: '', note: '' })
    } catch (e) {
      toast.error(e.message)
    }
  }

  function editModel(m) {
    setEditing(m ? { ...m, capabilities: [...m.capabilities] } : {
      provider: 'deepseek', model_id: '', display_name: '', capabilities: ['text'], price_per_unit: 1, unit_label: '次', est_wait_seconds: 30, enabled: true, is_mock: false,
    })
  }

  function toggleCap(cap) {
    setEditing((e) => ({
      ...e,
      capabilities: e.capabilities.includes(cap) ? e.capabilities.filter((c) => c !== cap) : [...e.capabilities, cap],
    }))
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-4xl font-extrabold">管理后台</h1>
      <p className="mt-2 text-white/50">模型注册表、套餐配置、用户与额度管理</p>

      <div className="mt-8 flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm ${tab === t.key ? 'bg-gradient-brand font-semibold text-ink-950' : 'border border-white/10 bg-white/5 text-white/60'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="mt-8"><ErrorState message={error} onRetry={load} /></div>}

      {tab === 'stats' && stats && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[['用户', stats.users], ['项目', stats.projects], ['生成任务', stats.tasks], ['成功', stats.succeeded], ['已退款', stats.refunded]].map(([k, v]) => (
            <div key={k} className="card p-5 text-center">
              <p className="text-sm text-white/40">{k}</p>
              <p className="mt-1 text-3xl font-extrabold gradient-text">{v}</p>
            </div>
          ))}
          <div className="card p-6 lg:col-span-5">
            <h3 className="font-bold">人工调整额度</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <select className="input" value={adjust.userId} onChange={(e) => setAdjust((a) => ({ ...a, userId: e.target.value }))} aria-label="选择用户">
                <option value="">选择用户</option>
                {users?.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
              </select>
              <input className="input" placeholder="额度变动（±）" value={adjust.amount} onChange={(e) => setAdjust((a) => ({ ...a, amount: e.target.value }))} aria-label="额度变动" />
              <input className="input" placeholder="备注" value={adjust.note} onChange={(e) => setAdjust((a) => ({ ...a, note: e.target.value }))} aria-label="备注" />
              <button onClick={submitAdjust} disabled={!adjust.userId || !adjust.amount} className="btn-primary">执行调整</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'models' && models && (
        <div className="mt-8">
          <button onClick={() => editModel(null)} className="btn-primary mb-4">＋ 新增模型</button>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/40">
                  <th className="p-4">显示名</th><th className="p-4">Provider</th><th className="p-4">Model ID</th><th className="p-4">能力</th><th className="p-4">单价</th><th className="p-4">状态</th><th className="p-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id} className="border-b border-white/5">
                    <td className="p-4 font-medium">{m.display_name}{m.is_mock && <span className="ml-1.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-300">Mock</span>}</td>
                    <td className="p-4 text-white/60">{m.provider}</td>
                    <td className="p-4 font-mono text-xs text-white/50">{m.model_id}</td>
                    <td className="p-4 text-xs text-white/50">{m.capabilities.join(', ')}</td>
                    <td className="p-4 text-white/60">{m.price_per_unit}{m.unit_label}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${m.enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/40'}`}>{m.enabled ? '启用' : '停用'}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button onClick={() => editModel(m)} className="text-brand-cyan hover:underline">编辑</button>
                        <button onClick={() => toggleModel(m)} className="text-white/50 hover:text-white">{m.enabled ? '停用' : '启用'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-white/30">部署前请由管理员核验各模型的官方 API 型号、图片输入与图像生成能力；Mock 模型仅用于演示。</p>
        </div>
      )}

      {tab === 'plans' && plans && (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {plans.plans.map((p, i) => (
            <div key={p.id} className="card p-5">
              <div className="flex items-center justify-between">
                <input className="input !w-40 font-semibold" value={p.name} onChange={(e) => { const ps = [...plans.plans]; ps[i].name = e.target.value; setPlans({ ...plans, plans: ps }) }} aria-label="套餐名" />
                <span className="font-mono text-xs text-white/40">{p.key}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="label">月价 (¥)</label>
                  <input type="number" className="input" value={p.price_monthly} onChange={(e) => { const ps = [...plans.plans]; ps[i].price_monthly = e.target.value; setPlans({ ...plans, plans: ps }) }} />
                </div>
                <div>
                  <label className="label">周期额度</label>
                  <input type="number" className="input" value={p.credits_per_period} onChange={(e) => { const ps = [...plans.plans]; ps[i].credits_per_period = e.target.value; setPlans({ ...plans, plans: ps }) }} />
                </div>
                <div>
                  <label className="label">导出质量</label>
                  <input className="input" value={p.export_quality} onChange={(e) => { const ps = [...plans.plans]; ps[i].export_quality = e.target.value; setPlans({ ...plans, plans: ps }) }} />
                </div>
                <div>
                  <label className="label">团队席位</label>
                  <input type="number" className="input" value={p.team_seats} onChange={(e) => { const ps = [...plans.plans]; ps[i].team_seats = e.target.value; setPlans({ ...plans, plans: ps }) }} />
                </div>
              </div>
              <button onClick={() => savePlan(plans.plans[i])} className="btn-ghost mt-4 w-full text-sm">保存套餐</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && users && (
        <div className="card mt-8 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/40">
                <th className="p-4">邮箱</th><th className="p-4">昵称</th><th className="p-4">角色</th><th className="p-4">套餐</th><th className="p-4">订阅</th><th className="p-4">注册时间</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5">
                  <td className="p-4">{u.email}</td>
                  <td className="p-4 text-white/60">{u.name}</td>
                  <td className="p-4 text-white/60">{u.role}</td>
                  <td className="p-4 text-white/60">{u.plan}</td>
                  <td className="p-4 text-white/60">{u.subscription_status}</td>
                  <td className="p-4 text-white/30">{u.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 模型编辑弹层 */}
      {editing && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-ink-850 p-6">
            <h3 className="text-lg font-bold">{editing.id ? '编辑模型' : '新增模型'}</h3>
            <div className="mt-4 space-y-3">
              <div><label className="label">显示名称</label><input className="input" value={editing.display_name} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Provider</label>
                  <select className="input" value={editing.provider} onChange={(e) => setEditing({ ...editing, provider: e.target.value })}>
                    {['deepseek', 'openai', 'mock'].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div><label className="label">Model ID</label><input className="input font-mono text-sm" value={editing.model_id} onChange={(e) => setEditing({ ...editing, model_id: e.target.value })} /></div>
              </div>
              <div>
                <span className="label">能力</span>
                <div className="flex flex-wrap gap-2">
                  {CAP_OPTIONS.map((c) => (
                    <button key={c} onClick={() => toggleCap(c)} className={`rounded-full px-3 py-1 text-xs ${editing.capabilities.includes(c) ? 'bg-gradient-brand font-semibold text-ink-950' : 'border border-white/10 bg-white/5 text-white/50'}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">单价（额度）</label><input type="number" step="0.5" className="input" value={editing.price_per_unit} onChange={(e) => setEditing({ ...editing, price_per_unit: e.target.value })} /></div>
                <div><label className="label">预计等待(s)</label><input type="number" className="input" value={editing.est_wait_seconds} onChange={(e) => setEditing({ ...editing, est_wait_seconds: e.target.value })} /></div>
                <div><label className="label">Mock</label>
                  <select className="input" value={editing.is_mock ? '1' : '0'} onChange={(e) => setEditing({ ...editing, is_mock: e.target.value === '1' })}>
                    <option value="0">否</option><option value="1">是</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setEditing(null)} className="btn-ghost flex-1">取消</button>
              <button onClick={saveModel} disabled={!editing.display_name || !editing.model_id} className="btn-primary flex-1">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
