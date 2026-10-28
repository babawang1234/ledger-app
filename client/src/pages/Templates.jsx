import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Loading, ErrorState, EmptyState } from '../components/States'
import Modal from '../components/Modal'
import PosterCanvas from '../components/PosterCanvas'

const CATEGORIES = ['全部', '活动', '电商', '社媒', '品牌']
const SORTS = [
  { key: 'featured', label: '精选优先' },
  { key: 'newest', label: '最新' },
]

export default function Templates() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState(null)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('全部')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('featured')
  const [detail, setDetail] = useState(null)
  const [stockQuery, setStockQuery] = useState('editorial portrait')
  const [stockPhotos, setStockPhotos] = useState([])
  const [stockError, setStockError] = useState('')
  const [stockLoading, setStockLoading] = useState(false)
  const [assetStatus, setAssetStatus] = useState(null)

  async function load() {
    setError('')
    setTemplates(null)
    try {
      const params = new URLSearchParams()
      if (category !== '全部') params.set('category', category)
      if (q.trim()) params.set('q', q.trim())
      const data = await api.get(`/templates?${params.toString()}`)
      setTemplates(data.templates)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0)
    return () => clearTimeout(t)
  }, [category, q])

  useEffect(() => {
    api.get('/assets/status').then(setAssetStatus).catch(() => setAssetStatus({ anyConfigured: true }))
  }, [])

  const sorted = useMemo(() => {
    if (!templates) return []
    const arr = [...templates]
    if (sort === 'newest') arr.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    return arr
  }, [templates, sort])

  async function openDetail(t) {
    try {
      const d = await api.get(`/templates/${t.id}`)
      setDetail(d.template)
    } catch (e) {
      setError(e.message)
    }
  }

  function useTemplate(t) {
    // 把模板的尺寸、用途、风格参数、示例文案带入创作台
    navigate('/studio', {
      state: {
        preset: {
          purpose: t.purpose,
          canvasRatio: null,
          canvasWidth: t.canvas?.width,
          canvasHeight: t.canvas?.height,
          content: t.sampleContent || {},
          styleAnalysis: {
            palette: (t.designNotes?.palette || '').match(/#[0-9a-fA-F]{6}/g) || [],
            mock: true,
          },
          stockAsset: t.stockAsset || null,
          source: t.name,
        },
      },
    })
  }

  async function searchStock() {
    if (!stockQuery.trim()) return
    setStockLoading(true)
    setStockError('')
    try {
      const result = await api.get(`/assets/search?q=${encodeURIComponent(stockQuery.trim())}&orientation=portrait`)
      setStockPhotos(result.photos || [])
    } catch (e) {
      setStockError(e.message)
    } finally {
      setStockLoading(false)
    }
  }

  async function usePhoto(photo) {
    try {
      await api.post('/assets/select', { id: photo.id })
      navigate('/studio', { state: { preset: { purpose: '品牌宣传', stockAsset: photo, source: '真实摄影灵感' } } })
    } catch (e) {
      setStockError(e.message)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#151612] px-6 py-10 sm:px-10 md:py-14">
        <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full bg-[#d9ff72]/10 blur-[90px]" />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.24em] text-[#d9ff72]">THE POSTER INDEX / 2026</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">灵感，不该长一个样。</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55">看真实影像如何长成一张完整海报：从摄影主视觉、字体层级到信息编排。选中案例即可带入工作台继续改。</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs text-white/40"><span className="grid h-9 w-9 place-items-center rounded-full border border-[#d9ff72]/30 text-[#d9ff72]">✳</span><span>精选创作案例<br /><b className="text-white">主题摄影 · 原创排版</b></span></div>
        </div>
      </div>

      <section className="mt-10 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-5 sm:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d9ff72]">PHOTO ASSET SEARCH</p>
            <h2 className="mt-2 text-2xl font-bold">真实摄影海报灵感</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">用真实摄影素材预览海报层级，选中后直接带入创作台作为主视觉底图；字体和文案仍由排版引擎单独生成、可编辑。</p>
          </div>
          <div className="flex w-full gap-2 md:max-w-md">
            <input className="input" value={stockQuery} onChange={(e) => setStockQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchStock()} placeholder="例如 coffee, flowers, architecture" aria-label="搜索摄影灵感" />
            <button className="btn-primary shrink-0 text-sm" onClick={searchStock} disabled={stockLoading}>{stockLoading ? '搜索中…' : '搜索摄影图'}</button>
          </div>
        </div>
        {assetStatus && !assetStatus.anyConfigured && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[.04] p-4 text-sm leading-relaxed text-white/55">
            <p><strong className="text-white/80">摄影图库尚未配置 API Key。</strong>当前版本仍可正常使用全部排版生成与导出功能；如需真实摄影素材搜索，请在 <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">server/.env</code> 设置 <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">UNSPLASH_ACCESS_KEY</code> 或 <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">PEXELS_API_KEY</code> 后重启服务。</p>
            <p className="mt-1.5 text-xs text-white/35">Unsplash Key 可在其官网开发者页面免费申请；未配置时开放图库（Openverse）作为兜底，但在部分网络环境可能不可达。</p>
          </div>
        )}
        {stockError && <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200/80">{stockError}</p>}
        {stockPhotos.length > 0 && <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stockPhotos.map((photo, index) => <article key={photo.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-ink-950">
            <div className="relative aspect-[4/5] overflow-hidden">
              <img src={photo.url} alt={photo.description} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <span className="text-[10px] uppercase tracking-[0.22em] text-white/65">STUDIO / 0{index + 1}</span>
                <p className="mt-3 text-2xl font-black leading-tight text-white">让灵感<br />落在真实里</p>
                <div className="mt-3 h-px w-10 bg-white/65" />
                <p className="mt-2 text-xs text-white/75">影像主视觉 · 独立文字图层</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 p-3">
              <span className="truncate text-[11px] text-white/45">Photo by {photo.photographer}</span>
              <a href={photo.unsplashUrl} target="_blank" rel="noreferrer" className="shrink-0 text-[11px] text-white/45 underline hover:text-white">Unsplash</a>
            </div>
            <div className="px-3 pb-3"><button onClick={() => usePhoto(photo)} className="btn-ghost w-full text-xs">用作海报主视觉</button></div>
          </article>)}
        </div>}
        <p className="mt-4 text-[11px] text-white/30">摄影素材按来源许可要求热链显示，并链接摄影师与来源页；文字与排版始终由排版引擎独立生成。</p>
      </section>

      {/* 筛选 + 搜索 + 排序 */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                category === c ? 'bg-[#d9ff72] text-[#171914]' : 'border border-white/10 bg-white/[.04] text-white/55 hover:bg-white/10 hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索案例…"
            aria-label="搜索案例"
            className="input !w-full sm:!w-48"
          />
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="排序方式" className="input !w-auto">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-10">
        {error && <ErrorState message={error} onRetry={load} />}
        {!error && !templates && <Loading text="加载灵感中…" />}
        {!error && templates && templates.length === 0 && (
          <EmptyState
            icon="🔍"
            title="没有找到匹配的案例"
            description={q ? `没有与「${q}」相关的案例，试试其他关键词` : '该分类暂无案例'}
            action={<button onClick={() => { setQ(''); setCategory('全部') }} className="btn-ghost text-sm">清除筛选</button>}
          />
        )}
        {templates && templates.length > 0 && (
          <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((t) => (
              <article key={t.id} className="group min-w-0">
                <button onClick={() => openDetail(t)} className="block w-full text-left" aria-label={`查看 ${t.name} 详情`}>
                  <div className="relative overflow-hidden rounded-[3px] border border-white/10 bg-[#d8d2c6] p-2 shadow-[0_18px_48px_rgba(0,0,0,.24)] transition duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_26px_60px_rgba(0,0,0,.42)]">
                    {t.thumbnail_path ? (
                      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#ebe7de]">
                        <img
                          src={t.thumbnail_path}
                          alt={t.name}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-contain transition duration-700 group-hover:scale-[1.015]"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/5] w-full" />
                    )}
                    {t.badge && (
                      <span className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-[10px] font-black tracking-wide backdrop-blur ${t.badge === '编辑精选' ? 'bg-[#d9ff72] text-[#171914]' : 'border border-white/30 bg-black/45 text-white'}`}>
                        {t.badge}
                      </span>
                    )}
                  </div>
                </button>
                <div className="pt-4">
                  <div className="flex items-start justify-between gap-3"><h3 className="text-base font-bold tracking-tight text-white/90">{t.name}</h3><span className="shrink-0 pt-1 text-[10px] font-bold uppercase tracking-[.14em] text-[#d9ff72]">{t.category}</span></div>
                  <p className="mt-2 text-xs text-white/40">{t.purpose} <span className="px-1.5 text-white/20">/</span> {t.canvas?.width} × {t.canvas?.height}</p>
                  {t.stockAsset && <p className="mt-1.5 text-[11px] text-white/40">Photo by <a href={t.stockAsset.profileUrl} target="_blank" rel="noreferrer" className="underline hover:text-white">{t.stockAsset.photographer}</a> on <a href={t.stockAsset.unsplashUrl} target="_blank" rel="noreferrer" className="underline hover:text-white">Unsplash</a></p>}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/50">{tag}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => openDetail(t)} className="btn-ghost flex-1 !rounded-lg !py-2 text-xs">看设计拆解</button>
                    <button onClick={() => useTemplate(t)} className="flex-1 rounded-lg bg-[#d9ff72] py-2 text-xs font-bold text-[#171914] transition hover:bg-[#e5ff9c]">带入工作台 ↗</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.name || ''}
        footer={
          <button onClick={() => detail && (setDetail(null), useTemplate(detail))} className="btn-primary w-full">
            使用此模板
          </button>
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="mx-auto max-w-[320px]">
              <PosterCanvas
                canvas={detail.canvas}
                background={detail.background}
                layers={detail.layers}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/60">{detail.purpose}</span>
              <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/60">{detail.canvas?.width}×{detail.canvas?.height}</span>
              {detail.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/50">{tag}</span>
              ))}
            </div>
            {detail.stockAsset && <p className="text-xs text-white/45">摄影素材：<a href={detail.stockAsset.profileUrl} target="_blank" rel="noreferrer" className="underline hover:text-white">{detail.stockAsset.photographer}</a> · <a href={detail.stockAsset.unsplashUrl} target="_blank" rel="noreferrer" className="underline hover:text-white">查看 Unsplash 原图</a></p>}
            <div>
              <h4 className="text-sm font-semibold text-white/80">设计说明</h4>
              <p className="mt-1.5 text-sm leading-relaxed text-white/60">{detail.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['配色', detail.designNotes?.palette],
                ['标题层级', detail.designNotes?.hierarchy],
                ['构图特点', detail.designNotes?.composition],
                ['适用场景', detail.designNotes?.scenario],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-white/5 p-3">
                  <p className="text-xs font-semibold text-white/70">{k}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
