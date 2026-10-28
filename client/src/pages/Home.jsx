import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import Icon from '../components/Icon'

const features = [
  { icon: 'text', title: '文字精准渲染', desc: '所有文字由排版引擎作为独立图层渲染，不依赖 AI 画字，中文永不乱码。' },
  { icon: 'palette', title: '参考图风格提取', desc: '上传参考图，自动分析配色、构图与字体气质，生成原创版式。' },
  { icon: 'layers', title: '图层级编辑器', desc: '文字、图片、颜色、位置、字体全部可调，所见即所得。' },
  { icon: 'resize', title: '多尺寸一键适配', desc: '一次生成，适配公众号封面、朋友圈、电商主图等多平台尺寸。' },
]

const steps = [
  { n: '1', t: '描述需求', d: '一句话说出你想做什么图，Agent 解析并检索模板' },
  { n: '2', t: '挑选模板', d: '从官方原创案例中选一个直接套用，或从零生成' },
  { n: '3', t: '填写内容', d: '标题、正文、时间地点、品牌、CTA' },
  { n: '4', t: '生成方案', d: '获得 4 个原创版式，文字全部可移动可修改' },
  { n: '5', t: '多尺寸导出', d: '一键适配并导出 PNG / JPG' },
]

export default function Home() {
  const [featured, setFeatured] = useState([])
  const [idea, setIdea] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/templates').then((d) => setFeatured(d.templates.filter((t) => t.featured).slice(0, 3))).catch(() => {})
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-14 md:pb-24 md:pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(rgba(255,255,255,.13)_1px,transparent_1px)] [background-size:24px_24px]" aria-hidden />
        <div className="pointer-events-none absolute -right-40 top-0 -z-10 h-[560px] w-[560px] rounded-full bg-[#d9ff72]/10 blur-[130px]" aria-hidden />
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-16">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d9ff72]/25 bg-[#d9ff72]/[.08] px-4 py-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#d9ff72]">
              <Icon name="spark" size={15} /> I’M NOT A WORKHORSE · DESIGN AGENT
            </span>
            <h1 className="mt-7 max-w-2xl text-5xl font-black leading-[1.08] tracking-[-.045em] md:text-6xl lg:text-[4.5rem]">
              牛马不加班，<br /><span className="text-[#d9ff72]">设计AI包</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/60">
              把参考图、文案和设计判断交给一个懂排版的创作 Agent。先出视觉方向，再逐层精修，最后一键适配所有尺寸。
            </p>
            {/* 描述需求直达入口 */}
            <form
              className="mt-7 flex max-w-xl gap-2 rounded-xl border border-white/15 bg-white/[0.06] p-2 backdrop-blur"
              onSubmit={(e) => { e.preventDefault(); navigate('/studio', { state: { description: idea } }) }}
            >
              <input
                aria-label="描述你想做的海报"
                className="min-w-0 flex-1 bg-transparent px-3 text-sm text-white/85 outline-none placeholder:text-white/35"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="描述你想做的海报，例如：咖啡店新品促销，发朋友圈"
              />
              <button type="submit" className="shrink-0 rounded-lg bg-[#d9ff72] px-4 py-2.5 text-sm font-black text-[#171914] transition hover:bg-[#e5ff9c]">
                开始创作
              </button>
            </form>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/studio" className="inline-flex items-center gap-2 rounded-xl bg-[#d9ff72] px-6 py-3.5 text-sm font-black text-[#171914] transition hover:bg-[#e5ff9c]">
                开始做海报 <Icon name="arrow" size={18} />
              </Link>
              <Link to="/templates" className="btn-ghost !rounded-xl !border-white/15 !px-6 !py-3.5 text-sm">逛真实案例 <Icon name="arrow" size={16} /></Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-xs text-white/45">
              <span>✳ 中文文字独立排版</span><span>✳ 参考图风格拆解</span><span>✳ 多尺寸导出</span>
            </div>
          </div>

          {/* 作品拼贴：保留完整海报画面，采用编辑部式错落排版 */}
          <div className="relative mx-auto grid w-full max-w-2xl grid-cols-[.78fr_1fr_0.78fr] items-center gap-3 md:gap-4">
            <div className="space-y-3 pt-16 md:space-y-4">
              {featured[0] && <div className="rotate-[-4deg] overflow-hidden rounded-[4px] border border-white/15 bg-[#e9e4d9] p-1.5 shadow-2xl"><img src={featured[0].thumbnail_path} alt={featured[0].name} className="w-full" loading="lazy" /></div>}
              <p className="pl-1 text-[9px] uppercase tracking-[.2em] text-white/35">01 / Campaign</p>
            </div>
            <div className="relative z-10 -mt-5">
              {featured[1] && <div className="overflow-hidden rounded-[4px] border border-white/15 bg-[#e9e4d9] p-1.5 shadow-[0_28px_80px_rgba(0,0,0,.55)]"><img src={featured[1].thumbnail_path} alt={featured[1].name} className="w-full" loading="lazy" /></div>}
              <div className="mt-3 flex items-center justify-between text-[9px] uppercase tracking-[.18em] text-white/45"><span>ART DIRECTION / AI</span><span>2026</span></div>
            </div>
            <div className="space-y-3 pt-24 md:space-y-4">
              {featured[2] && <div className="rotate-[4deg] overflow-hidden rounded-[4px] border border-white/15 bg-[#e9e4d9] p-1.5 shadow-2xl"><img src={featured[2].thumbnail_path} alt={featured[2].name} className="w-full" loading="lazy" /></div>}
              <p className="pr-1 text-right text-[9px] uppercase tracking-[.2em] text-white/35">02 / Editorial</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-center text-xs font-bold uppercase tracking-[.22em] text-[#d9ff72]">WORK LESS · DESIGN MORE</p>
        <h2 className="mt-3 text-center text-3xl font-black tracking-tight">不是套模板，是把设计流程交给 Agent</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-white/50">解决 AI 生成海报的三大痛点：文字乱码、不可编辑、尺寸难适配</p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card p-6 transition hover:border-brand-violet/40">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#d9ff72]/10 text-[#d9ff72]">
                <Icon name={f.icon} size={22} />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 精选案例 */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#d9ff72]">MADE WITH THE AGENT</p>
              <h2 className="mt-2 text-3xl font-black">从真实影像到完整海报</h2>
              <p className="mt-3 text-white/50">主题摄影、独立字体和版式层级，每一张案例都能继续编辑</p>
            </div>
            <Link to="/templates" className="btn-ghost text-sm">查看全部 <Icon name="arrow" size={16} /></Link>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {featured.map((t) => (
              <Link key={t.id} to="/templates" className="card group overflow-hidden">
                <div className="relative overflow-hidden">
                  <div className="relative aspect-[4/5] overflow-hidden bg-ink-900">
                    <img src={t.thumbnail_path} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl" />
                    <img src={t.thumbnail_path} alt={t.name} className="absolute inset-0 h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]" loading="lazy" />
                  </div>
                  {t.badge && <span className="absolute left-3 top-3 rounded-full bg-gradient-brand px-2.5 py-1 text-xs font-bold text-ink-950">{t.badge}</span>}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">{t.name}</h3>
                  <p className="mt-1 text-xs text-white/40">{t.purpose}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Steps */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">五步完成一张海报</h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s) => (
            <div key={s.n} className="card relative p-5">
              <span className="absolute -top-3 left-5 grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand text-sm font-bold text-ink-950">
                {s.n}
              </span>
              <h3 className="mt-4 font-semibold">{s.t}</h3>
              <p className="mt-1.5 text-sm text-white/50">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 套餐入口 + FAQ */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="card relative overflow-hidden p-10 md:p-14">
          <div className="pointer-events-none absolute inset-0 bg-gradient-brand opacity-10" aria-hidden />
          <div className="relative grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold">准备好让设计提速了吗？</h2>
              <p className="mt-3 text-white/60">注册即送免费额度，立刻体验完整创作流程</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="btn-primary !px-8 !py-3 shadow-glow">免费开始创作</Link>
                <Link to="/pricing" className="btn-ghost !px-8 !py-3">查看套餐</Link>
              </div>
            </div>
            <div className="space-y-3">
              {[
                ['文字会不会乱码？', '不会。所有文字由排版引擎作为独立图层渲染，中文精准。'],
                ['生成失败扣额度吗？', '平台侧失败不扣额度，已扣部分自动返还。'],
                ['可以取消续费吗？', '可以，账户页一键自助取消，当期权益保留至到期。'],
              ].map(([q, a]) => (
                <div key={q} className="rounded-xl bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white/80">{q}</p>
                  <p className="mt-1 text-sm text-white/50">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
