import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'
import { Loading, ErrorState, EmptyState } from '../components/States'
import Modal from '../components/Modal'

export default function Projects() {
  const toast = useToast()
  const navigate = useNavigate()
  const [projects, setProjects] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  async function load() {
    try {
      setError('')
      const d = await api.get('/projects')
      setProjects(d.projects)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [])

  async function createProject() {
    if (!newName.trim()) { toast.error('请填写项目名称'); return }
    try {
      const d = await api.post('/projects', { name: newName, purpose: '社媒运营', canvasRatio: '3:4', canvasWidth: 1080, canvasHeight: 1440 })
      toast.success('项目已创建')
      setCreating(false)
      navigate(`/studio/${d.project.id}`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function remove(id) {
    if (!confirm('确定删除该项目及其所有版式与导出记录？此操作不可恢复。')) return
    try {
      await api.del(`/projects/${id}`)
      toast.success('已删除')
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold">作品库</h1>
          <p className="mt-2 text-white/50">你的所有项目、版式与导出记录</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary">＋ 新建项目</button>
      </div>

      {error && <div className="mt-10"><ErrorState message={error} onRetry={load} /></div>}
      {!error && !projects && <Loading />}
      {projects && projects.length === 0 && (
        <div className="mt-10">
          <EmptyState
            icon="📁"
            title="还没有项目"
            description="创建第一个项目，开始你的 AI 海报创作之旅"
            action={<Link to="/studio" className="btn-primary mt-2">前往创作工作台</Link>}
          />
        </div>
      )}
      {projects && projects.length > 0 && (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <article key={p.id} className="card p-5">
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 text-xs text-white/40">
                {p.purpose} · {p.canvas_ratio} · {p.canvas_width}×{p.canvas_height} · {p.resolution}
              </p>
              <p className="mt-3 text-xs text-white/30">更新于 {p.updated_at?.slice(0, 10)}</p>
              <div className="mt-4 flex gap-2">
                <Link to={`/studio/${p.id}`} className="btn-ghost flex-1 text-sm">打开</Link>
                <button onClick={() => remove(p.id)} className="btn-ghost text-sm !text-red-300/70 hover:!text-red-300">删除</button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="新建项目"
        footer={<button onClick={createProject} className="btn-primary w-full">创建并进入工作台</button>}
      >
        <label className="label" htmlFor="np-name">项目名称</label>
        <input id="np-name" className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="例如：周末市集海报" />
        <p className="mt-3 text-xs text-white/40">创建后可在工作台中完善用途、尺寸等设置。</p>
      </Modal>
    </div>
  )
}
