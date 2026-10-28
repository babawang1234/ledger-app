import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/auth'
import { useToast } from '../components/Toast'
import { Loading, ErrorState } from '../components/States'

export default function Pricing() {
  const { user, refreshBalance } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [subscribing, setSubscribing] = useState('')

  async function load() {
    try {
      setError('')
      const d = await api.get('/account/plans')
      setData(d)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function subscribe(planKey) {
    if (!user) {
      toast.error('请先登录')
      return
    }
    setSubscribing(planKey)
    try {
      await api.post('/account/subscribe', { planKey })
      toast.success(`已开通「${data.plans.find((p) => p.key === planKey)?.name}」（演示环境）`)
      await refreshBalance()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubscribing('')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold">价格方案</h1>
        <p className="mt-3 text-white/50">月订阅含额度，另可单独购买额度包。随时自助取消续费。</p>
        <p className="mt-2 inline-block rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs text-amber-300">
          演示环境 · 支付尚未接入，以下操作不会产生真实扣费
        </p>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !data && <Loading />}
      {data && (
        <>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {data.plans.map((p) => {
              const isCurrent = user?.plan === p.key
              return (
                <div
                  key={p.key}
                  className={`card relative flex flex-col p-6 ${
                    p.key === 'pro' ? 'border-brand-violet/50 shadow-glow' : ''
                  }`}
                >
                  {p.key === 'pro' && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-brand px-3 py-1 text-xs font-bold text-ink-950">
                      最受欢迎
                    </span>
                  )}
                  <h3 className="text-lg font-bold">{p.name}</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-extrabold gradient-text">¥{p.price_monthly}</span>
                    <span className="text-sm text-white/40">/月</span>
                  </div>
                  <p className="mt-2 text-sm text-white/50">
                    每月含 <strong className="text-white">{p.credits_per_period}</strong> 额度
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm text-white/70">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="text-brand-cyan">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => subscribe(p.key)}
                    disabled={subscribing === p.key}
                    className={`mt-6 ${p.key === 'pro' ? 'btn-primary' : 'btn-ghost'} w-full`}
                  >
                    {isCurrent ? '当前套餐' : subscribing === p.key ? '开通中…' : p.price_monthly === 0 ? '免费开始' : '开通（演示）'}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 额度包 */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold">额度包</h2>
            <p className="mt-2 text-sm text-white/50">订阅之外按需补充，一次购买、用完为止</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {data.packs.map((pack) => (
                <div key={pack.key} className="card flex items-center justify-between p-5">
                  <div>
                    <h3 className="font-semibold">{pack.name}</h3>
                    <p className="mt-1 text-sm text-white/50">¥{pack.price}</p>
                  </div>
                  <button
                    disabled
                    title="支付功能尚未接入"
                    className="cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/40"
                  >
                    暂未开放
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/30">支付功能接入后即可购买额度包。</p>
          </div>

          {/* 说明 */}
          <div className="mt-16 card p-8">
            <h2 className="text-xl font-bold">常见问题</h2>
            <dl className="mt-6 space-y-6">
              {[
                ['额度是什么？', '额度用于生成海报方案、风格分析与文案优化。每次生成前会显示预计消耗；平台侧失败不扣额度，已扣部分自动返还。'],
                ['免费额度怎么算？', '注册即送 20 免费额度。订阅套餐每月自动发放对应额度，额度包为一次性购买、用完为止。'],
                ['导出质量有何区别？', '免费版支持 1x PNG；个人版起支持 2x 高清导出；工作室版支持 4x。所有版本文字均为矢量级文字层渲染。'],
                ['模型权限如何区分？', '专业版起开放手动选择模型的能力。可用模型由后台管理员配置，未配置或未验证的模型不会出现在选择列表中。'],
                ['如何取消续费？', '进入「账户与账单」即可一键自助取消，当期权益保留至到期。'],
              ].map(([q, a]) => (
                <div key={q}>
                  <dt className="font-semibold">{q}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-white/50">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </>
      )}
    </div>
  )
}
