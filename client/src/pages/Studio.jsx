import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/auth'
import { useToast } from '../components/Toast'
import { Loading, ErrorState, Spinner } from '../components/States'
import PosterCanvas from '../components/PosterCanvas'

const STEPS = ['描述需求', '画布与素材', '海报内容', '生成设置', '版式方案', '编辑导出']
const FLOW_STEPS = [
  { label: '描述想法', states: [0] },
  { label: '文案与尺寸', states: [1, 2] },
  { label: '生成海报', states: [3] },
  { label: '微调导出', states: [4, 5] },
]

const DESCRIPTION_EXAMPLES = [
  '我想做一张教师节海报，感谢老师，温暖典雅',
  '我想做一张咖啡店新品拿铁的促销海报，发朋友圈',
  '给公司招聘设计师做一张简约风格的社媒配图',
  '周末市集活动宣传海报，要清新自然的感觉',
  '双十一直播带货预告，手机全屏竖图，暖色热闹一点',
]

const PURPOSES = [
  { key: '节日祝福', desc: '教师节、节日致谢与祝福海报' },
  { key: '活动宣传', desc: '发布会、市集、演出等线下活动主视觉' },
  { key: '产品推广', desc: '新品上市、产品卖点介绍' },
  { key: '电商促销', desc: '大促、秒杀、优惠活动引流' },
  { key: '社媒运营', desc: '公众号、朋友圈、小红书配图' },
  { key: '品牌宣传', desc: '品牌形象、价值主张、节日问候' },
  { key: '招聘启事', desc: '岗位招聘、雇主品牌' },
]
const RATIOS = [
  { key: '3:4', w: 1080, h: 1440, label: '3:4 竖版' },
  { key: '9:16', w: 1080, h: 1920, label: '9:16 手机全屏' },
  { key: '1:1', w: 1080, h: 1080, label: '1:1 方图' },
  { key: '16:9', w: 1920, h: 1080, label: '16:9 横版' },
  { key: '4:3', w: 1200, h: 900, label: '4:3 横版' },
  { key: 'custom', w: 0, h: 0, label: '自定义' },
]
const RESOLUTIONS = [
  { key: '1x', label: '标准 (1x)', scale: 1, note: '导出与画布同尺寸' },
  { key: '2x', label: '高清 (2x)', scale: 2, note: '导出尺寸 ×2，额度消耗 +50%' },
  { key: '3x', label: '超清 (3x)', scale: 3, note: '导出尺寸 ×3，额度消耗 +100%' },
]
const CAPABILITIES = [
  { key: 'image_generation', label: '快速草稿', icon: '⚡', desc: '快速生成版式方案', needRef: '可选参考图', wait: '约 5-15 秒', tier: 'basic' },
  { key: 'image_edit', label: '高质量成图', icon: '💎', desc: '精细渲染，耗时更长', needRef: '建议提供参考图', wait: '约 30-60 秒', tier: 'standard' },
  { key: 'text', label: '文案优化', icon: '✍️', desc: 'AI 优化标题与文案', needRef: '无需参考图', wait: '约 3-10 秒', tier: 'basic' },
  { key: 'image_input', label: '参考图分析', icon: '🔍', desc: '深度解析视觉风格', needRef: '必须上传参考图', wait: '约 5-20 秒', tier: 'standard' },
]
const EXPORT_SIZES = [
  { label: '原始尺寸', scale: 1 },
  { label: '公众号封面 900×383', scale: 0.35 },
  { label: '高清 2x', scale: 2 },
]

export default function Studio() {
  const { projectId } = useParams()
  const location = useLocation()
  const toast = useToast()
  const { refreshBalance, balance, user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [project, setProject] = useState(null)
  const [error, setError] = useState('')

  // step0 描述需求
  const [description, setDescription] = useState('')
  const [interpreting, setInterpreting] = useState(false)
  const [brief, setBrief] = useState(null)
  const [matchedTemplates, setMatchedTemplates] = useState([])
  const [chosenTemplate, setChosenTemplate] = useState(null)
  // 模板发现（花瓣式关键词检索）
  const [discoverQ, setDiscoverQ] = useState('')
  const [discoverList, setDiscoverList] = useState([])
  const [discovering, setDiscovering] = useState(false)
  const [discoverSeed, setDiscoverSeed] = useState(1)
  const [discoverMatched, setDiscoverMatched] = useState(0)

  // step1
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState(PURPOSES[0].key)
  const [ratio, setRatio] = useState(RATIOS[0])
  const [customW, setCustomW] = useState('')
  const [customH, setCustomH] = useState('')
  const [resolution, setResolution] = useState(RESOLUTIONS[1])
  const [dimError, setDimError] = useState('')

  // step2
  const [refFile, setRefFile] = useState(null)
  const [refPreview, setRefPreview] = useState('')
  const [referenceAsset, setReferenceAsset] = useState(null)
  const [styleAnalysis, setStyleAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [lockedFields, setLockedFields] = useState({})
  const [stockQuery, setStockQuery] = useState('')
  const [stockPhotos, setStockPhotos] = useState([])
  const [stockAsset, setStockAsset] = useState(null)
  const [searchingStock, setSearchingStock] = useState(false)

  // step3
  const [content, setContent] = useState({
    headline: '', subheadline: '', body: '', datetime: '', location: '', brand: '', cta: '',
  })
  const [assets, setAssets] = useState({ product: null, logo: null, qrcode: null })
  const [polishing, setPolishing] = useState(false)
  const [suggestion, setSuggestion] = useState(null)

  // step4
  const [capability, setCapability] = useState('image_generation')
  const [models, setModels] = useState([])
  const [modelId, setModelId] = useState('') // 空 = 自动路由
  const [estimate, setEstimate] = useState(null)

  // step5/6
  const [generating, setGenerating] = useState(false)
  const [layouts, setLayouts] = useState([])
  const [selectedLayout, setSelectedLayout] = useState(null)
  const [editingLayers, setEditingLayers] = useState([])
  const [selectedLayer, setSelectedLayer] = useState(null)
  const [savedLayoutId, setSavedLayoutId] = useState('')
  const [exports, setExports] = useState([])
  const [exporting, setExporting] = useState('')
  const [exportResult, setExportResult] = useState(null)
  const exportingRef = useRef(false)
  // 撤销/重做
  const historyRef = useRef({ undo: [], redo: [] })
  const [historyVersion, setHistoryVersion] = useState(0)

  const isPro = ['pro', 'studio'].includes(user?.plan)

  function pushHistory(snapshot) {
    historyRef.current.undo.push(snapshot)
    if (historyRef.current.undo.length > 50) historyRef.current.undo.shift()
    historyRef.current.redo = []
    setHistoryVersion((v) => v + 1)
  }

  function undo() {
    const snap = historyRef.current.undo.pop()
    if (!snap) return
    historyRef.current.redo.push(editingLayers)
    setEditingLayers(snap)
    setSelectedLayer(null)
    setHistoryVersion((v) => v + 1)
  }

  function redo() {
    const snap = historyRef.current.redo.pop()
    if (!snap) return
    historyRef.current.undo.push(editingLayers)
    setEditingLayers(snap)
    setSelectedLayer(null)
    setHistoryVersion((v) => v + 1)
  }

  useEffect(() => {
    api.get('/generate/models').then((d) => setModels(d.models)).catch(() => {})
    // 从首页/灵感库带入的预设参数
    const preset = location.state?.preset
    const incomingDescription = location.state?.description
    if (incomingDescription && !description) {
      setDescription(incomingDescription)
      interpretDescription(incomingDescription)
    }
    if (preset) {
      if (preset.purpose) setPurpose(preset.purpose)
      if (preset.canvasWidth && preset.canvasHeight) {
        const matched = RATIOS.find((r) => r.w === preset.canvasWidth && r.h === preset.canvasHeight)
        if (matched) setRatio(matched)
        else { setRatio(RATIOS[5]); setCustomW(String(preset.canvasWidth)); setCustomH(String(preset.canvasHeight)) }
      }
      if (preset.content) setContent((c) => ({ ...c, ...preset.content }))
      if (preset.stockAsset) setStockAsset(preset.stockAsset)
      if (preset.styleAnalysis) {
        setStyleAnalysis({ ...preset.styleAnalysis, mock: true, source: preset.source })
      }
      if (preset.source) setName(`${preset.source}（模板）`)
    }
    if (projectId) {
      api.get(`/projects/${projectId}`).then((d) => {
        setProject(d.project)
        setName(d.project.name)
        setPurpose(d.project.purpose || PURPOSES[0].key)
        const r = RATIOS.find((x) => x.key === d.project.canvas_ratio) || RATIOS[0]
        setRatio(r)
      }).catch((e) => setError(e.message))
    }
  }, [projectId])

  const availableModels = useMemo(
    () => models.filter((m) => m.capabilities.includes(capability)),
    [models, capability]
  )

  async function fetchEstimate(cap, mid, hasStock = false) {
    try {
      const est = await api.post('/generate/estimate', { capability: cap, modelId: mid || undefined, stockAsset: hasStock || undefined })
      setEstimate(est)
    } catch {
      setEstimate(null)
    }
  }

  useEffect(() => {
    fetchEstimate(capability, modelId, !!stockAsset)
  }, [capability, modelId, stockAsset])

  function effectiveCanvas() {
    if (ratio.key === 'custom') {
      return { w: parseInt(customW, 10) || 0, h: parseInt(customH, 10) || 0 }
    }
    return { w: ratio.w, h: ratio.h }
  }

  function validateDims() {
    const { w, h } = effectiveCanvas()
    if (w < 200 || h < 200) return '尺寸不能小于 200px'
    if (w > 4000 || h > 4000) return '尺寸不能超过 4000px'
    return ''
  }

  /** 幂等创建项目：已创建则直接复用 */
  async function ensureProject() {
    if (project) return project
    if (!name.trim()) {
      toast.error('请填写项目名称')
      return null
    }
    const dimErr = validateDims()
    if (dimErr) {
      setDimError(dimErr)
      toast.error(dimErr)
      return null
    }
    const { w, h } = effectiveCanvas()
    try {
      const d = await api.post('/projects', {
        name, purpose, canvasRatio: ratio.key, canvasWidth: w, canvasHeight: h, resolution: resolution.key,
      })
      setProject(d.project)
      return d.project
    } catch (e) {
      toast.error(e.message)
      return null
    }
  }

  /** 理解需求、自动起草文案，并预选对应主题的真实摄影主视觉。 */
  /** 关键词发现模板：命中优先，推荐补齐；换一换递增 seed */
  async function discoverTemplates(q = discoverQ, seed = discoverSeed, { silent = false } = {}) {
    const query = String(q || '').trim()
    setDiscoverQ(query)
    setDiscovering(true)
    try {
      const params = new URLSearchParams({ seed: String(seed), limit: '12' })
      if (query) params.set('q', query)
      const d = await api.get(`/templates/discover?${params.toString()}`)
      setDiscoverList(d.templates || [])
      setDiscoverMatched(d.matched || 0)
      return d.templates || []
    } catch (e) {
      if (!silent) toast.error(e.message)
      return []
    } finally {
      setDiscovering(false)
    }
  }

  async function interpretDescription(text = description) {
    const desc = String(text || '').trim()
    if (!desc) {
      toast.error('先描述一下你想做的海报吧')
      return
    }
    setInterpreting(true)
    setStockAsset(null)
    setChosenTemplate(null)
    setMatchedTemplates([])
    try {
      const d = await api.post('/inspire/interpret', { description: desc })
      setBrief(d.brief)
      setMatchedTemplates(d.templates || [])
      // 自动填文案与视觉建议，用户可直接检查并修改。
      if (d.brief.purpose) setPurpose(d.brief.purpose)
      if (d.brief.ratioHint) {
        const matched = RATIOS.find((r) => r.key === d.brief.ratioHint)
        if (matched) setRatio(matched)
      }
      const drafted = d.content || {}
      setContent((current) => ({ ...current, ...drafted }))
      const projectTitle = drafted.headline || d.brief.subject || desc.slice(0, 18)
      setName((current) => current.trim() ? current : `${projectTitle}海报`)
      // 关键词驱动模板发现
      const kw = d.imageSearchQuery || d.brief.subject || (d.brief.keywords || []).join(' ') || desc
      const seed = Math.floor(Math.random() * 1e6)
      setDiscoverSeed(seed)
      const topTemplate = d.templates?.[0]
      if (topTemplate) {
        setChosenTemplate(topTemplate)
        const notes = topTemplate.designNotes || {}
        const colors = String(notes.palette || '').match(/#[0-9a-fA-F]{6}/g) || []
        setStyleAnalysis({
          palette: colors.length >= 3 ? colors.slice(0, 3) : ['#d9ff72', '#f0a17c', '#25261f'],
          paletteNotes: notes.palette || '',
          composition: notes.composition || '',
          typography: notes.hierarchy || '',
          mock: !!d.brief.mock,
          source: d.brief.mock ? '本地主题语义匹配' : 'AI 理解与摄影素材匹配',
        })
      }
      const found = await discoverTemplates(kw, seed, { silent: true })
      if (topTemplate?.stockAsset) setStockAsset(topTemplate.stockAsset)
      else if (found[0]?.stockAsset) setStockAsset(found[0].stockAsset)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setInterpreting(false)
    }
  }

  /** 选用检索到的模板：带入尺寸/示例文案/风格，直接进入内容填写 */
  async function useTemplate(t) {
    setChosenTemplate(t)
    const presetContent = t.sampleContent || {}
    setContent((current) => Object.values(current).some((value) => String(value || '').trim()) ? current : ({ ...current, ...presetContent }))
    if (t.stockAsset) setStockAsset(t.stockAsset)
    const matched = RATIOS.find((r) => r.w === t.canvas?.width && r.h === t.canvas?.height)
    if (matched) setRatio(matched)
    else if (t.canvas?.width && t.canvas?.height) { setRatio(RATIOS[5]); setCustomW(String(t.canvas.width)); setCustomH(String(t.canvas.height)) }
    if (t.purpose) setPurpose(t.purpose)
    if (!name.trim()) setName(`${t.name}海报`)
    // 模板设计说明 → 风格参数
    const dn = t.designNotes || {}
    setStyleAnalysis({
      palette: t.style?.palette || String(dn.palette || '').match(/#[0-9a-fA-F]{6}/g) || ['#d9ff72', '#f0a17c', '#25261f'],
      paletteNotes: dn.palette || '',
      composition: dn.composition || '',
      typography: dn.hierarchy || '',
      whitespace: dn.hierarchy || '',
      decoration: dn.scenario || '',
      mock: !t.stockAsset,
      source: `灵感库模板 · ${t.name}`,
    })
    const proj = await ensureProject()
    if (proj) {
      toast.success(`已套用模板「${t.name}」，内容可继续修改`)
      setStep(2)
    }
  }

  async function continueFromBrief() {
    if (!brief) return interpretDescription()
    if (!content.headline?.trim()) {
      const result = await api.post('/inspire/interpret', { description: description || name })
      setContent((current) => ({ ...current, ...(result.content || {}) }))
    }
    const proj = await ensureProject()
    if (proj) setStep(2)
  }

  async function analyzeReference(file) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片不能超过 10MB')
      return
    }
    if (!/image\/(png|jpe?g|webp|gif)/i.test(file.type)) {
      toast.error('仅支持 PNG/JPG/WebP/GIF 图片')
      return
    }
    setRefFile(file)
    setRefPreview(URL.createObjectURL(file))
    setAnalyzing(true)
    try {
      const up = await api.upload('/upload', (() => { const fd = new FormData(); fd.append('file', file); return fd })())
      // 视觉分析走后端模型（未接入真实视觉模型时返回演示结果）
      setReferenceAsset(up.file)
      const task = await api.post('/generate', { projectId: project?.id, capability: 'image_input', params: { imageUrl: up.file.url, prompt: '分析参考图风格' } })
      const run = await api.post(`/generate/${task.task.id}/run`)
      const est = await api.post('/generate/estimate', { capability: 'image_input' })
      let analysis = run.output
      if (typeof analysis === 'string') {
        try { analysis = JSON.parse(analysis) } catch { analysis = {} }
      }
      if (!analysis || typeof analysis !== 'object') analysis = {}
      const palette = Array.isArray(analysis.palette) && analysis.palette.length >= 3
        ? analysis.palette
        : ['#7c5cff', '#5b6cff', '#38d9f5']
      setStyleAnalysis({
        ...analysis,
        primary: analysis.primary || palette[0],
        secondary: analysis.secondary || palette[1],
        accent: analysis.accent || palette[2],
        palette,
        mock: !!run.mock,
        source: run.mock ? '本地色彩采样' : '视觉模型分析',
      })
      toast.success(run.mock ? '风格分析完成（演示模式）' : '风格分析完成')
      await refreshBalance()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setAnalyzing(false)
    }
  }

  function updateAnalysis(k, v) {
    setStyleAnalysis((s) => ({ ...s, [k]: v }))
  }

  function toggleLock(k) {
    setLockedFields((l) => ({ ...l, [k]: !l[k] }))
  }

  function removeReference() {
    setRefFile(null)
    setRefPreview('')
    setReferenceAsset(null)
    setStyleAnalysis(null)
  }

  function onDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer?.files?.[0]
    if (f) analyzeReference(f)
  }

  function updateContent(k, v) {
    setContent((c) => ({ ...c, [k]: v }))
  }

  // 文案润色（演示：未接入语言模型时返回明确的演示结果，不覆盖原文，用户选择应用）
  async function polish(field) {
    const original = content[field]
    if (!original.trim()) {
      toast.error('请先填写该字段内容')
      return
    }
    setPolishing(field)
    try {
      const task = await api.post('/generate', {
        projectId: project?.id, capability: 'text',
        params: { prompt: `润色以下文案：${original}`, content },
      })
      const run = await api.post(`/generate/${task.task.id}/run`)
      const mock = !!run.mock
      // 生成 2-3 个备选（演示数据）
      const suggestions = mock
        ? [original + ' —— 焕新表达', `精选 · ${original}`, `${original}，为你而来`]
        : [run.layouts?.[0]?.name || original]
      setSuggestion({ field, original, suggestions, mock })
      await refreshBalance()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setPolishing('')
    }
  }

  function applySuggestion(text) {
    if (suggestion) {
      updateContent(suggestion.field, text)
      setSuggestion(null)
      toast.success('已应用，原文可随时恢复')
    }
  }

  async function uploadAsset(kind, file) {
    try {
      const fd = new FormData()
      fd.append('file', file)
      const up = await api.upload('/upload', fd)
      setAssets((a) => ({ ...a, [kind]: up.file }))
      toast.success('上传成功')
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function generate() {
    setGenerating(true)
    try {
      let finalStockAsset = stockAsset
      if (!finalStockAsset) {
        const briefResult = await api.post('/inspire/interpret', { description: description || content.headline || purpose })
        const recommended = briefResult.templates?.find((template) => template.stockAsset)
        if (recommended?.stockAsset) {
          finalStockAsset = recommended.stockAsset
          setStockAsset(finalStockAsset)
          setChosenTemplate(recommended)
        }
      }
      if (!finalStockAsset) throw new Error('没有找到匹配的实景照片。请回到需求描述，或在素材区选择摄影图后再生成。')
      const activeProject = await ensureProject()
      if (!activeProject) return
      const { w, h } = effectiveCanvas()
      const task = await api.post('/generate', {
        projectId: activeProject.id,
        capability,
        modelId: modelId || undefined,
        params: {
          prompt: [
            `为${purpose}海报创作一张高品质主视觉图，供后续文字排版使用。`,
            '默认保持地域中性：不额外添加国旗、地标、地图、民族服饰或特定地域建筑；只有用户明确点名时才加入。',
            `主视觉主题：${content.headline || '根据用途创作合适的视觉主体'}`,
            content.subheadline && `补充主题：${content.subheadline}`,
            content.body && `核心信息：${content.body}`,
            styleAnalysis?.palette?.length && `参考色板：${styleAnalysis.palette.slice(0, 3).join('、')}`,
            styleAnalysis?.composition && `构图方向：${styleAnalysis.composition}`,
            '画面中不要生成文字、Logo、二维码或按钮；保留适合后续排版的留白。',
          ].filter(Boolean).join('\n'),
          purpose,
          width: w,
          height: h,
          content,
          styleAnalysis,
          referenceUrl: referenceAsset?.url,
          stockAsset: finalStockAsset ? {
            id: finalStockAsset.id,
            provider: finalStockAsset.provider,
            sourceName: finalStockAsset.sourceName,
            url: finalStockAsset.url,
            photographer: finalStockAsset.photographer,
            profileUrl: finalStockAsset.profileUrl,
            sourceUrl: finalStockAsset.sourceUrl,
            unsplashUrl: finalStockAsset.unsplashUrl,
            license: finalStockAsset.license,
            licenseUrl: finalStockAsset.licenseUrl,
            templateStyle: finalStockAsset.templateStyle,
            curated: finalStockAsset.curated,
          } : null,
        },
      })
      const run = await api.post(`/generate/${task.task.id}/run`)
      if (run.status === 'succeeded') {
        setLayouts(run.layouts)
        if (run.mock) toast.success('已用真实照片生成可编辑海报方案')
        else toast.success('已生成 4 个摄影海报版式方案')
        await refreshBalance()
        setStep(4)
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function searchStockPhotos(query = stockQuery, originalQuery = description, { silent = false } = {}) {
    const searchQuery = String(query || '').trim()
    if (!searchQuery) return []
    setStockQuery(searchQuery)
    setSearchingStock(true)
    try {
      const data = await api.get(`/assets/search?q=${encodeURIComponent(searchQuery)}&original=${encodeURIComponent(originalQuery || '')}&orientation=${ratio.w >= ratio.h ? 'landscape' : 'portrait'}`)
      setStockPhotos(data.photos || [])
      if (!data.photos?.length && !silent) toast.push(data.message || '没有找到匹配素材，试着缩短关键词或换一个主体描述。')
      else if (data.photos?.length) setStockAsset(data.photos[0])
      return data.photos || []
    } catch (e) {
      if (!silent) toast.error(e.message)
      return []
    } finally {
      setSearchingStock(false)
    }
  }

  async function chooseStockPhoto(photo) {
    try {
      await api.post('/assets/select', { id: photo.id, provider: photo.provider })
      setStockAsset(photo)
      toast.success(`已选择 ${photo.sourceName || '摄影'}素材，生成图会保留来源信息`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function pickLayout(layout) {
    setSelectedLayout(layout)
    const withIds = layout.layers.map((l, i) => ({ ...l, id: `layer-${i}` }))
    setEditingLayers(withIds)
    historyRef.current = { undo: [], redo: [] }
    setHistoryVersion((v) => v + 1)
    setStep(5)
    // 保存到项目
    try {
      const d = await api.post(`/projects/${project?.id}/layouts`, {
        name: layout.name, layers: withIds, canvas: layout.canvas, background: layout.background,
      })
      setSavedLayoutId(d.layout.id)
    } catch (e) {
      toast.error(e.message)
    }
  }

  function updateLayer(id, patch) {
    setEditingLayers((ls) => {
      const next = ls.map((l) => (l.id === id ? { ...l, ...patch } : l))
      return next
    })
    setSelectedLayer((s) => (s && s.id === id ? { ...s, ...patch } : s))
  }

  function commitEdit() {
    // 在连续编辑提交时记录历史（由具体操作调用）
  }

  function pushHistoryNow() {
    pushHistory(editingLayers)
  }

  function updateLayerWithHistory(id, patch) {
    pushHistory(editingLayers)
    updateLayer(id, patch)
  }

  function duplicateLayout() {
    if (!savedLayoutId) return
    const cloned = editingLayers.map((l, i) => ({ ...l, id: `layer-copy-${i}` }))
    setEditingLayers(cloned)
    toast.success('已复制方案为独立图层（可在图层列表编辑）')
  }

  async function saveEdits() {
    if (!savedLayoutId) return
    try {
      await api.patch(`/projects/${project?.id}/layouts/${savedLayoutId}`, { layers: editingLayers })
      toast.success('已保存')
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function doExport(format, size) {
    if (exportingRef.current) return
    exportingRef.current = true
    setExporting(size.label)
    setExportResult(null)
    try {
      await saveEdits()
      const d = await api.post(`/projects/${project?.id}/layouts/${savedLayoutId}/export`, {
        format, sizeLabel: size.label, scale: size.scale,
      })
      setExports((x) => [d.export, ...x])
      setExportResult(d.export)
      toast.success(`已导出 ${size.label}（${d.export.width}×${d.export.height}）`)
    } catch (e) {
      toast.error(e.message)
    } finally {
      exportingRef.current = false
      setExporting('')
    }
  }

  async function loadExportHistory() {
    try {
      const d = await api.get(`/projects/${project.id}/exports`)
      setExports(d.exports)
    } catch {}
  }

  useEffect(() => {
    if (step === 5 && project) loadExportHistory()
  }, [step, project])

  if (error) return <div className="mx-auto max-w-3xl px-4 py-12"><ErrorState message={error} /></div>

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* 步骤条 */}
      <ol className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="创作步骤">
        {FLOW_STEPS.map((flow, i) => {
          const activeFlow = FLOW_STEPS.findIndex((item) => item.states.includes(step))
          const current = i === activeFlow
          const complete = i < activeFlow
          const targetStep = i === 1 ? 2 : flow.states[0]
          return (
            <li key={flow.label}>
              <button
                onClick={() => setStep(targetStep)}
                disabled={i > activeFlow}
                className={`flex w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-sm transition ${
                  current ? 'bg-gradient-brand font-semibold text-ink-950'
                  : complete ? 'border border-brand-violet/40 bg-brand-violet/10 text-white/80 hover:bg-brand-violet/20'
                  : 'border border-white/10 text-white/30'
                }`}
                aria-current={current ? 'step' : undefined}
              >
                <span className="font-bold">{complete ? '✓' : i + 1}</span> {flow.label}
              </button>
            </li>
          )
        })}
      </ol>

      {/* Step 1 描述需求 */}
      {step === 0 && (
        <section className="mx-auto max-w-4xl">
          <div className="card p-8">
            <h1 className="text-2xl font-bold">你想做一张什么样的海报？</h1>
            <p className="mt-2 text-sm text-white/50">用一句自然的话描述需求，我会解析用途与风格，并去灵感库检索匹配的模板供你选择。</p>

            <textarea
              aria-label="海报需求描述"
              rows={3}
              className="input mt-6 text-base"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：我想做一张咖啡店新品拿铁的促销海报，发朋友圈，暖色一点"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {DESCRIPTION_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => { setDescription(ex); interpretDescription(ex) }}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/55 transition hover:border-brand-violet/40 hover:text-white/80"
                >
                  {ex}
                </button>
              ))}
            </div>

            <button onClick={() => interpretDescription()} disabled={interpreting} className="btn-primary mt-5 w-full">
              {interpreting ? '正在理解你的需求…' : brief ? '重新解析' : '开始创作'}
            </button>

            {interpreting && (
              <div className="mt-6 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-4 rounded" />)}</div>
            )}

            {brief && !interpreting && (
              <div className="mt-7">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">我对需求的理解</h2>
                  <span className={`rounded-full border px-2.5 py-1 text-xs ${brief.mock ? 'border-white/15 bg-white/5 text-white/45' : 'border-[#d9ff72]/25 bg-[#d9ff72]/10 text-[#d9ff72]'}`} title={brief.mockNote}>
                    {brief.mock ? '快速理解' : 'AI 已理解'}
                  </span>
                </div>
                <ul className="mt-3 space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/65">
                  {brief.understanding.map((line, i) => <li key={i} className="flex gap-2"><span className="text-brand-cyan">›</span>{line}</li>)}
                </ul>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-white/40">用途：</span>
                  {PURPOSES.map((p) => (
                    <button key={p.key} onClick={() => setPurpose(p.key)} className={`rounded-full px-3 py-1 text-xs ${purpose === p.key ? 'bg-gradient-brand font-semibold' : 'border border-white/10 bg-white/5 text-white/55'}`}>{p.key}</button>
                  ))}
                </div>
                {brief.keywords?.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-white/40">关键词：</span>
                    {brief.keywords.map((k) => <span key={k} className="rounded-md bg-brand-violet/15 px-2 py-0.5 text-xs text-brand-violet">{k}</span>)}
                  </div>
                )}
              </div>
            )}
          </div>

          {brief && !interpreting && (
            <div className="card mt-6 p-8">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">挑一个模板开始</h2>
                  <p className="mt-1 text-xs text-white/45">输入关键词找更多同类版式；所有模板进入工作台后都可重新排版、逐字编辑。</p>
                </div>
                <span className="text-xs text-white/40">{discoverMatched > 0 ? `命中 ${discoverMatched} 个相关模板` : '为你推荐'}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <input
                  className="input"
                  value={discoverQ}
                  onChange={(e) => setDiscoverQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && discoverTemplates(discoverQ, Math.floor(Math.random() * 1e6))}
                  placeholder="输入关键词找模板，例如：咖啡、促销、招聘、发布会…"
                  aria-label="按关键词搜索模板"
                />
                <button onClick={() => discoverTemplates(discoverQ, Math.floor(Math.random() * 1e6))} disabled={discovering} className="btn-ghost shrink-0 text-sm">
                  {discovering ? '搜索中…' : '搜索'}
                </button>
                <button onClick={() => discoverTemplates(discoverQ, Math.floor(Math.random() * 1e6))} disabled={discovering} className="btn-ghost shrink-0 text-sm" title="换一批模板">
                  ⟳ 换一换
                </button>
              </div>

              {discovering ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton aspect-[3/4] rounded-xl" />)}
                </div>
              ) : discoverList.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-white/15 p-8 text-center">
                  <p className="text-sm text-white/50">换个关键词试试，或直接从零开始创作。</p>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {discoverList.map((t) => (
                    <div key={t.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition hover:border-brand-violet/50">
                      <div className="relative">
                        <img src={t.thumbnail_path || t.thumbnail} alt={t.name} loading="lazy" className="aspect-[3/4] w-full bg-ink-900 object-cover" />
                        {t.badge && <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white/85 backdrop-blur">{t.badge}</span>}
                      </div>
                      <div className="p-3.5">
                        <p className="truncate text-sm font-semibold">{t.name}</p>
                        <p className="mt-0.5 text-xs text-brand-cyan/80">{t.category} · {t.canvas?.width}×{t.canvas?.height}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/45">{t.designNotes?.composition || t.description}</p>
                        <button onClick={() => useTemplate(t)} className="btn-primary mt-3 w-full text-sm">用这个模板</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={continueFromBrief} className="btn-ghost mt-6 w-full">
                不用模板，从零开始创作（文案已自动填写）→
              </button>
            </div>
          )}
        </section>
      )}

      {/* Step 2 画布与素材（原项目设置 + 参考图合并） */}
      {step === 1 && (
        <section className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1fr_320px]">
          <div className="card p-8">
            <h1 className="text-2xl font-bold">画布与素材</h1>
            <p className="mt-2 text-sm text-white/50">确定用途与尺寸；参考图和摄影素材都可跳过。</p>

            <div className="mt-6 space-y-6">
              <div>
                <label htmlFor="pname" className="label">项目名称</label>
                <input id="pname" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：双 11 大促海报" />
              </div>

              <div>
                <span className="label">海报用途</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PURPOSES.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setPurpose(p.key)}
                      className={`rounded-xl p-3 text-left text-sm transition ${purpose === p.key ? 'border-2 border-brand-violet bg-brand-violet/10' : 'border border-white/10 bg-white/5 hover:bg-white/10'}`}
                    >
                      <strong>{p.key}</strong>
                      <span className="mt-0.5 block text-xs text-white/40">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="label">画布比例</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {RATIOS.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setRatio(r)}
                      className={`rounded-xl p-3 text-left text-sm ${ratio.key === r.key ? 'border-2 border-brand-violet bg-brand-violet/10' : 'border border-white/10 bg-white/5'}`}
                    >
                      <strong>{r.label}</strong>
                      <span className="block text-xs text-white/40">{r.key === 'custom' ? '手动输入宽高' : `${r.w}×${r.h}`}</span>
                    </button>
                  ))}
                </div>
                {ratio.key === 'custom' && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="label" htmlFor="cw">宽度 (px)</label>
                      <input id="cw" type="number" className="input" value={customW} onChange={(e) => setCustomW(e.target.value)} placeholder="1080" />
                    </div>
                    <div>
                      <label className="label" htmlFor="ch">高度 (px)</label>
                      <input id="ch" type="number" className="input" value={customH} onChange={(e) => setCustomH(e.target.value)} placeholder="1920" />
                    </div>
                  </div>
                )}
                <p className="mt-2 text-xs text-white/40">尺寸范围 200–4000px。</p>
              </div>

              <div>
                <span className="label">分辨率</span>
                <div className="flex flex-wrap gap-2">
                  {RESOLUTIONS.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setResolution(r)}
                      className={`rounded-xl px-4 py-2 text-left text-sm ${resolution.key === r.key ? 'border-2 border-brand-violet bg-brand-violet/10' : 'border border-white/10 bg-white/5'}`}
                    >
                      <strong>{r.label}</strong>
                      <span className="block text-xs text-white/40">{r.note}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 参考图与摄影素材（可选，折叠） */}
            <details className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4" open={!!refFile || !!stockAsset}>
              <summary className="cursor-pointer text-sm font-semibold text-white/80">参考图与摄影素材（可选）</summary>
              <p className="mt-2 text-xs text-white/45">参考图仅用于提取风格方向，生成结果为原创构图；两者都可跳过。</p>

              {!refFile ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                  className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 py-6 text-center transition hover:border-brand-violet/50"
                >
                  <label className="flex cursor-pointer flex-col items-center gap-2">
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => e.target.files[0] && analyzeReference(e.target.files[0])} />
                    <span className="text-2xl">🖼️</span>
                    <span className="text-sm text-white/50">点击上传，或拖拽图片到此处</span>
                    <span className="text-xs text-white/30">PNG / JPG / WebP / GIF，≤ 10MB</span>
                  </label>
                </div>
              ) : (
                <div className="mt-4 flex items-start gap-4">
                  <img src={refPreview} alt="参考图预览" className="h-20 w-20 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="truncate text-sm text-white/70">{refFile.name}</p>
                    <p className="text-xs text-white/40">{(refFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <div className="mt-2 flex gap-2">
                      <label className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 hover:bg-white/10">
                        <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files[0] && analyzeReference(e.target.files[0])} />
                        重新上传
                      </label>
                      <button onClick={removeReference} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-300">移除</button>
                    </div>
                  </div>
                </div>
              )}

              {analyzing && (
                <div className="mt-3 flex items-center gap-2 text-sm text-brand-cyan">
                  <Spinner /> AI 正在分析风格…
                </div>
              )}

              {styleAnalysis && !analyzing && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    {styleAnalysis.palette?.map((c) => <span key={c} className="h-5 w-5 rounded" style={{ background: c }} title={c} />)}
                    {styleAnalysis.mock && <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300">演示分析</span>}
                  </div>
                  {styleAnalysis.composition && <p className="text-xs text-white/55">构图：{styleAnalysis.composition}</p>}
                </div>
              )}

              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold">真实摄影素材</h4>
                    <p className="mt-1 text-xs leading-relaxed text-white/45">搜索多个开放图库的实景照片作为主视觉底图，导出会保留来源与许可信息。</p>
                  </div>
                  {stockAsset && <button onClick={() => setStockAsset(null)} className="shrink-0 text-xs text-red-300">移除素材</button>}
                </div>
                <div className="mt-3 flex gap-2">
                  <input className="input" value={stockQuery} onChange={(e) => setStockQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchStockPhotos()} placeholder="例如 coffee, architecture" aria-label="搜索摄影素材" />
                  <button onClick={searchStockPhotos} disabled={searchingStock} className="btn-ghost shrink-0 text-sm">{searchingStock ? '搜索中…' : '搜索'}</button>
                </div>
                {stockAsset && <p className="mt-3 text-xs text-brand-cyan">当前素材：{stockAsset.description} · Photo by {stockAsset.photographer} / {stockAsset.sourceName || '图库'} · {stockAsset.license || ''}</p>}
                {stockPhotos.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {stockPhotos.map((photo) => <button key={photo.id} onClick={() => chooseStockPhoto(photo)} className={`group overflow-hidden rounded-lg border text-left ${stockAsset?.id === photo.id ? 'border-brand-cyan' : 'border-white/10'}`}>
                    <img src={photo.thumb} alt={photo.description} loading="lazy" className="aspect-[4/3] w-full object-cover transition group-hover:scale-105" />
                    <span className="block truncate px-2 py-1.5 text-[10px] text-white/55">{photo.photographer}</span>
                  </button>)}
                </div>}
              </div>
            </details>

            <button
              onClick={async () => { const p = await ensureProject(); if (p) setStep(2) }}
              className="btn-primary mt-6 w-full"
            >
              下一步：填写内容
            </button>
            <button onClick={() => setStep(0)} className="mt-3 w-full text-sm text-white/40 hover:text-white/70">← 返回修改描述</button>
          </div>

          {/* 画布预览 */}
          <aside className="card h-fit p-5">
            <h3 className="text-sm font-semibold text-white/80">画布预览</h3>
            <div className="mt-3 rounded-xl bg-ink-800 p-4">
              <div
                className="mx-auto border border-white/20 bg-gradient-to-br from-brand-violet/30 via-brand-indigo/20 to-brand-cyan/20"
                style={{ aspectRatio: effectiveCanvas().w && effectiveCanvas().h ? `${effectiveCanvas().w}/${effectiveCanvas().h}` : '3/4', maxWidth: 200 }}
              >
                <div className="grid h-full w-full place-items-center text-xs text-white/50">
                  {effectiveCanvas().w && effectiveCanvas().h ? `${effectiveCanvas().w} × ${effectiveCanvas().h}` : '选择尺寸'}
                </div>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-white/50">
              <li>用途：{purpose || '—'}</li>
              <li>分辨率：{resolution.key}（导出 {Math.round((effectiveCanvas().w || 1080) * resolution.scale)}×{Math.round((effectiveCanvas().h || 1440) * resolution.scale)}）</li>
              {chosenTemplate && <li className="text-brand-cyan/80">模板：{chosenTemplate.name}</li>}
            </ul>
          </aside>
        </section>
      )}

      {/* Step 3 海报内容 */}
      {step === 2 && (
        <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_320px]">
          <div className="card p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">文案已经帮你起草好</h1>
                <p className="mt-2 text-sm text-white/50">检查标题和主文案即可继续，时间、地点等细节只有你提供时才会加入。</p>
              </div>
              {chosenTemplate && <span className="shrink-0 rounded-full border border-[#d9ff72]/20 bg-[#d9ff72]/10 px-3 py-1 text-xs text-[#d9ff72]">已匹配实景主图</span>}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ['headline', '主标题', '由需求自动生成，可修改', 'text'],
                ['subheadline', '副标题', '补充说明或活动主题', 'text'],
                ['body', '主要文案', '核心卖点或简短说明', 'textarea'],
              ].map(([k, label, ph, type]) => (
                <div key={k} className={k === 'headline' || k === 'body' ? 'sm:col-span-2' : ''}>
                  <div className="flex items-center justify-between">
                    <label htmlFor={`c-${k}`} className="label">{label}</label>
                    {['headline', 'subheadline', 'body'].includes(k) && (
                      <button
                        onClick={() => polish(k)}
                        disabled={polishing === k}
                        className="text-xs text-brand-cyan hover:underline disabled:opacity-50"
                      >
                        {polishing === k ? '润色中…' : '✨ 润色'}
                      </button>
                    )}
                  </div>
                  {type === 'textarea' ? (
                    <textarea id={`c-${k}`} rows={3} className="input" value={content[k]} onChange={(e) => updateContent(k, e.target.value)} placeholder={ph} />
                  ) : (
                    <input id={`c-${k}`} className="input" value={content[k]} onChange={(e) => updateContent(k, e.target.value)} placeholder={ph} />
                  )}
                </div>
              ))}
            </div>

            <details className="mt-4 rounded-xl border border-white/10 bg-white/[.025] p-4">
              <summary className="cursor-pointer text-sm font-medium text-white/65">补充信息（品牌、时间、地点、按钮）</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {[
                  ['datetime', '时间', '仅在需求中提供时填写'],
                  ['location', '地点', '仅在需求中提供时填写'],
                  ['brand', '品牌名', '你的品牌名称'],
                  ['cta', '按钮文案', '例如：立即选购'],
                ].map(([k, label, ph]) => (
                  <div key={k}>
                    <label htmlFor={`c-${k}`} className="label">{label}</label>
                    <input id={`c-${k}`} className="input" value={content[k]} onChange={(e) => updateContent(k, e.target.value)} placeholder={ph} />
                  </div>
                ))}
              </div>
            </details>

            {suggestion && (
              <div className="mt-4 rounded-xl border border-brand-cyan/30 bg-brand-cyan/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white/80">润色建议 {suggestion.mock ? '（演示）' : ''}</p>
                  <button onClick={() => setSuggestion(null)} className="text-xs text-white/40 hover:text-white">关闭</button>
                </div>
                <div className="mt-2 space-y-2">
                  {suggestion.suggestions.map((s, i) => (
                    <button key={i} onClick={() => applySuggestion(s)} className="block w-full rounded-lg bg-white/5 px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10">
                      {s}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-white/40">原文已保留，选择应用后才会替换。</p>
              </div>
            )}

            <details className="mt-4 rounded-xl border border-white/10 bg-white/[.025] p-4">
              <summary className="cursor-pointer text-sm font-medium text-white/65">添加产品图、Logo 或二维码（可选）</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {[['product', '产品图'], ['logo', 'Logo'], ['qrcode', '二维码']].map(([k, label]) => (
                  <div key={k}>
                    <span className="label">{label}</span>
                    <label className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-white/15 py-4 text-sm text-white/50 hover:border-brand-violet/50">
                      <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files[0] && uploadAsset(k, e.target.files[0])} />
                      {assets[k] ? '✓ 已上传' : `上传${label}`}
                    </label>
                  </div>
                ))}
              </div>
            </details>

            <div className="mt-8 flex gap-3">
              <button onClick={() => setStep(1)} className="btn-ghost text-sm">尺寸 / 参考图</button>
              <button onClick={() => setStep(3)} className="btn-primary flex-1">
                生成海报 →
              </button>
            </div>
          </div>

          {/* 文字层级预览 */}
          <aside className="card h-fit p-5">
            <h3 className="text-sm font-semibold text-white/80">文字层级预览</h3>
            <div className="mt-4 rounded-xl bg-ink-800 p-4">
              {content.headline && <p className="text-xl font-extrabold leading-tight">{content.headline}</p>}
              {content.subheadline && <p className="mt-2 text-sm font-medium text-white/80">{content.subheadline}</p>}
              {content.body && <p className="mt-3 text-xs text-white/50">{content.body}</p>}
              {(content.datetime || content.location) && (
                <p className="mt-3 text-xs text-white/40">{content.datetime}{content.datetime && content.location ? ' · ' : ''}{content.location}</p>
              )}
              {content.cta && (
                <span className="mt-4 inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-semibold text-white/80">{content.cta}</span>
              )}
              {!content.headline && <p className="text-sm text-white/30">填写内容后，这里预览文字层级。</p>}
            </div>
          </aside>
        </section>
      )}

      {/* Step 4 模型能力 */}
      {step === 3 && (
        <section className="mx-auto max-w-4xl">
          <div className="card p-8">
            <h1 className="text-2xl font-bold">准备生成摄影海报</h1>
            <p className="mt-2 text-sm text-white/50">系统已按你的主题匹配实景照片并自动排版。默认设置适合直接出图。</p>

            <details className="mt-5 rounded-xl border border-white/10 bg-white/[.025] p-4">
              <summary className="cursor-pointer text-sm font-medium text-white/65">高级设置：生成方式与模型（当前：自动推荐）</summary>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {CAPABILITIES.map((c) => {
                const active = capability === c.key
                const mockOnly = availableModels.every((m) => m.isMock)
                return (
                  <button
                    key={c.key}
                    onClick={() => { setCapability(c.key); setModelId('') }}
                    className={`rounded-xl p-4 text-left transition ${active ? 'border-2 border-brand-violet bg-brand-violet/10' : 'border border-white/10 bg-white/5 hover:bg-white/10'}`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="flex items-center gap-2"><span>{c.icon}</span>{c.label}</strong>
                    </div>
                    <span className="mt-1 block text-xs text-white/50">{c.desc}</span>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/40">
                      <span>{c.needRef}</span>
                      <span>·</span>
                      <span>{c.wait}</span>
                    </div>
                    {active && mockOnly && (
                      <span className="mt-2 inline-block rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-300">演示生成</span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <label htmlFor="model-select" className="label">模型</label>
                {!isPro && <span className="text-xs text-white/40">专业版起可手动选择，当前为自动路由</span>}
              </div>
              <select
                id="model-select"
                className="input disabled:opacity-50"
                value={modelId}
                disabled={!isPro}
                onChange={(e) => setModelId(e.target.value)}
              >
                <option value="">自动路由（推荐）</option>
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id} disabled={m.available === false}>
                    {m.displayName} · {m.pricePerUnit}{m.unitLabel} · 约 {m.estWaitSeconds}s{m.isMock ? '（演示）' : m.available === false ? '（未配置）' : ''}
                  </option>
                ))}
              </select>
              {availableModels.length === 0 && (
                <p className="mt-1 text-xs text-amber-300/80">该能力暂无可用模型，请选择其他能力。</p>
              )}
            </div>
            </details>

            {estimate && (
              <div className="mt-6 rounded-xl border border-brand-cyan/30 bg-brand-cyan/5 p-4 text-sm">
                <p>执行方式：<strong className="text-white/80">{estimate.model.displayName}</strong> · 预计消耗：<strong className="text-brand-cyan">{estimate.cost} 额度</strong> · 当前余额 {estimate.balance} · 预计等待 {estimate.estWaitSeconds}s · 生成 4 个方案</p>
                {estimate.model.isMock && (
                  <p className="mt-1 text-xs text-amber-300/80">⚠ 演示生成：未配置真实模型凭据，当前使用演示结果，不伪装为真实 AI 输出。</p>
                )}
                {estimate.balance < estimate.cost && <p className="mt-1 text-xs text-red-300">额度不足，请前往价格页购买。</p>}
                <p className="mt-1 text-xs text-white/40">平台侧失败不扣额度，已扣部分自动返还。</p>
              </div>
            )}

            <div className="mt-8 flex gap-3">
              <button onClick={() => setStep(2)} className="btn-ghost text-sm">上一步</button>
              <button
                onClick={generate}
                disabled={generating || (estimate && estimate.balance < estimate.cost) || availableModels.length === 0}
                className="btn-primary flex-1"
              >
                {generating ? '生成中…' : `生成版式方案（消耗 ${estimate?.cost ?? '—'} 额度）`}
              </button>
            </div>
          </div>
          {generating && (
            <div className="mt-6 card p-8 text-center">
              <Loading text="AI 正在排版，生成 4 个方案…" />
            </div>
          )}
        </section>
      )}

      {/* Step 5 版式方案 */}
      {step === 4 && (
        <section>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">选择版式方案</h1>
              <p className="mt-2 text-sm text-white/50">4 种不同构图，文字均为独立文字层，可进入编辑器逐项修改。</p>
            </div>
            <button onClick={() => setStep(3)} className="btn-ghost text-sm">重新生成</button>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {layouts.map((l, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="relative">
                  <PosterCanvas canvas={l.canvas} background={l.background} layers={l.layers} />
                  <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white/80 backdrop-blur">{l.feature}</span>
                </div>
                {l.stockAttribution && <p className="px-4 pt-3 text-[11px] text-white/45">Photo by <a className="underline decoration-white/25 hover:text-white" href={l.stockAttribution.profileUrl || l.stockAttribution.sourceUrl} target="_blank" rel="noreferrer">{l.stockAttribution.photographer}</a> on <a className="underline decoration-white/25 hover:text-white" href={l.stockAttribution.sourceUrl} target="_blank" rel="noreferrer">{l.stockAttribution.sourceName}</a>{l.stockAttribution.license ? ` · ${l.stockAttribution.license}` : ''}</p>}
                <div className="p-4">
                  <p className="text-sm font-semibold">{l.name}</p>
                  <p className="mt-0.5 text-xs text-white/40">配色：{l.palette}</p>
                  <button onClick={() => pickLayout(l)} className="btn-primary mt-3 w-full text-sm">应用此方案</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Step 6 编辑导出 */}
      {step === 5 && selectedLayout && (
        <section className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div>
            <PosterCanvas
              canvas={selectedLayout.canvas}
              background={selectedLayout.background}
              layers={editingLayers}
              editable
              selectedId={selectedLayer?.id}
              onSelectLayer={setSelectedLayer}
            />
            {selectedLayout.stockAttribution && <p className="mt-2 text-xs text-white/45">Photo by <a className="underline decoration-white/25 hover:text-white" href={selectedLayout.stockAttribution.profileUrl || selectedLayout.stockAttribution.sourceUrl} target="_blank" rel="noreferrer">{selectedLayout.stockAttribution.photographer}</a> on <a className="underline decoration-white/25 hover:text-white" href={selectedLayout.stockAttribution.sourceUrl} target="_blank" rel="noreferrer">{selectedLayout.stockAttribution.sourceName}</a>{selectedLayout.stockAttribution.license ? ` · ${selectedLayout.stockAttribution.license}` : ''}. Please retain the credit when sharing the exported poster.</p>}
            {/* 工具栏 */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={undo} disabled={!historyRef.current.undo.length} className="btn-ghost !px-3 !py-1.5 text-sm disabled:opacity-40">↩ 撤销</button>
              <button onClick={redo} disabled={!historyRef.current.redo.length} className="btn-ghost !px-3 !py-1.5 text-sm disabled:opacity-40">↪ 重做</button>
              <button onClick={duplicateLayout} className="btn-ghost !px-3 !py-1.5 text-sm">复制方案</button>
              <button onClick={saveEdits} className="btn-ghost !px-3 !py-1.5 text-sm">保存修改</button>
              <span className="mx-1 h-5 w-px bg-white/10" />
              <button onClick={() => doExport('png', EXPORT_SIZES[0])} disabled={!!exporting} className="btn-primary !px-3 !py-1.5 text-sm">
                {exporting === EXPORT_SIZES[0].label ? '导出中…' : '导出 PNG'}
              </button>
              <button onClick={() => doExport('jpg', EXPORT_SIZES[0])} disabled={!!exporting} className="btn-ghost !px-3 !py-1.5 text-sm">
                {exporting === EXPORT_SIZES[0].label ? '导出中…' : '导出 JPG'}
              </button>
            </div>

            {/* 多尺寸预览 */}
            <div className="mt-6 card p-5">
              <h3 className="font-semibold">多尺寸适配预览</h3>
              <p className="mt-1 text-xs text-white/40">以下为不同导出尺寸的等比预览，可分别检查文字溢出与主体裁切。</p>
              <div className="mt-4 flex flex-wrap gap-4">
                {[1, 0.35, 2].map((scale, i) => (
                  <div key={scale} className="text-center">
                    <div className="overflow-hidden rounded-lg border border-white/10" style={{ width: scale === 2 ? 160 : scale === 1 ? 120 : 200, height: scale === 2 ? 160 : scale === 1 ? 120 : 200 * 0.35 }}>
                      <PosterCanvas canvas={selectedLayout.canvas} background={selectedLayout.background} layers={editingLayers} />
                    </div>
                    <p className="mt-1.5 text-xs text-white/40">{['原始', '公众号封面', '高清 2x'][i]}</p>
                  </div>
                ))}
              </div>
            </div>

            {exportResult && (
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold text-emerald-300">✓ 导出成功</p>
                <p className="mt-1 text-white/60">{exportResult.size_label} · {exportResult.width}×{exportResult.height} · {exportResult.format.toUpperCase()}</p>
                <a href={exportResult.file_path} download className="mt-2 inline-block text-brand-cyan hover:underline">下载文件</a>
              </div>
            )}

            {exports.length > 0 && (
              <div className="mt-6 card p-5">
                <h3 className="font-semibold">导出历史</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {exports.map((e) => (
                    <li key={e.id} className="flex items-center justify-between">
                      <span className="text-white/60">{e.size_label} · {e.width}×{e.height} · {e.format.toUpperCase()}</span>
                      <a href={e.file_path} download className="text-brand-cyan hover:underline">下载</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 图层编辑器 */}
          <aside className="card max-h-[80vh] overflow-y-auto p-5">
            <h2 className="text-lg font-bold">图层编辑器</h2>
            <p className="mt-1 text-xs text-white/40">点击画布或下方图层选中，修改右侧属性。</p>
            <ul className="mt-4 space-y-1.5">
              {editingLayers.map((l) => (
                <li key={l.id}>
                  <button
                    onClick={() => setSelectedLayer(l)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${selectedLayer?.id === l.id ? 'bg-brand-violet/20 text-white' : 'text-white/60 hover:bg-white/5'}`}
                  >
                    <span className="truncate">
                      {l.type === 'text' ? `T ${l.text?.slice(0, 12) || '(空)'}` : l.type === 'shape' ? '▢ 形状' : '🖼 图片'}
                    </span>
                    <span className="text-xs text-white/30">z{l.zIndex ?? 0}</span>
                  </button>
                </li>
              ))}
            </ul>

            {selectedLayer && (
              <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
                <h3 className="text-sm font-semibold text-white/80">编辑图层</h3>
                {selectedLayer.type === 'text' && (
                  <>
                    <div>
                      <label className="label" htmlFor="lt-text">文字内容</label>
                      <textarea id="lt-text" rows={2} className="input" value={selectedLayer.text || ''} onChange={(e) => updateLayerWithHistory(selectedLayer.id, { text: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label" htmlFor="lt-size">字号 (px)</label>
                        <input id="lt-size" type="number" className="input" value={Math.round(selectedLayer.fontSize <= 1 ? selectedLayer.fontSize * selectedLayout.canvas.width : selectedLayer.fontSize)} onChange={(e) => updateLayerWithHistory(selectedLayer.id, { fontSize: parseInt(e.target.value, 10) || 32 })} />
                      </div>
                      <div>
                        <label className="label" htmlFor="lt-weight">字重</label>
                        <select id="lt-weight" className="input" value={selectedLayer.fontWeight || 400} onChange={(e) => updateLayerWithHistory(selectedLayer.id, { fontWeight: parseInt(e.target.value, 10) })}>
                          {[300, 400, 500, 700, 800, 900].map((w) => <option key={w} value={w}>{w}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label" htmlFor="lt-color">颜色</label>
                        <input id="lt-color" type="color" className="input !h-10 !py-1" value={selectedLayer.color?.startsWith('#') ? selectedLayer.color : '#ffffff'} onChange={(e) => updateLayerWithHistory(selectedLayer.id, { color: e.target.value })} />
                      </div>
                      <div>
                        <label className="label" htmlFor="lt-align">对齐</label>
                        <select id="lt-align" className="input" value={selectedLayer.align || 'left'} onChange={(e) => updateLayerWithHistory(selectedLayer.id, { align: e.target.value })}>
                          {[['left', '左对齐'], ['center', '居中'], ['right', '右对齐']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label" htmlFor="lt-x">X 位置 (%)</label>
                        <input id="lt-x" type="number" className="input" value={Math.round((selectedLayer.x <= 1 ? selectedLayer.x * 100 : (selectedLayer.x / selectedLayout.canvas.width) * 100) || 0)} onChange={(e) => updateLayerWithHistory(selectedLayer.id, { x: (parseFloat(e.target.value) || 0) / 100 })} />
                      </div>
                      <div>
                        <label className="label" htmlFor="lt-y">Y 位置 (%)</label>
                        <input id="lt-y" type="number" className="input" value={Math.round((selectedLayer.y <= 1 ? selectedLayer.y * 100 : (selectedLayer.y / selectedLayout.canvas.height) * 100) || 0)} onChange={(e) => updateLayerWithHistory(selectedLayer.id, { y: (parseFloat(e.target.value) || 0) / 100 })} />
                      </div>
                    </div>
                  </>
                )}
                {selectedLayer.type === 'shape' && (
                  <div>
                    <label className="label" htmlFor="ls-color">形状颜色</label>
                    <input id="ls-color" type="color" className="input !h-10 !py-1" value={selectedLayer.color?.startsWith('#') ? selectedLayer.color : '#ffffff'} onChange={(e) => updateLayerWithHistory(selectedLayer.id, { color: e.target.value })} />
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selectedLayer.visible !== false} onChange={(e) => updateLayerWithHistory(selectedLayer.id, { visible: e.target.checked })} />
                  显示该图层
                </label>
              </div>
            )}
          </aside>
        </section>
      )}
    </div>
  )
}

