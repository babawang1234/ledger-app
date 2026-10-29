import { config } from '../config/index.js'

/**
 * 通义万相 Adapter —— 阿里云百炼（DashScope）文生图。
 * 模型：wanx-v1 / wan2.1-t2i-turbo 等，支持中文 prompt，国内直连。
 *
 * 万相文生图是异步接口：先提交任务拿 task_id，再轮询查询结果。
 */
export class WanxAdapter {
  constructor() {
    this.provider = 'dashscope'
    this.baseUrl = config.providers.dashscope.baseUrl
    this.apiKey = config.providers.dashscope.apiKey
  }

  get available() {
    return !!this.apiKey
  }

  async _request(pathname, body) {
    const res = await fetch(`${this.baseUrl}${pathname}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`万相 API ${res.status}: ${text.slice(0, 300)}`)
    }
    return res.json()
  }

  /** 提交文生图任务，返回 task_id */
  async _submitTask(prompt, size, model) {
    const data = await this._request('/services/aigc/text2image/image-synthesis', {
      model,
      input: { prompt },
      parameters: { size, n: 1 },
    })
    const taskId = data?.output?.task_id
    if (!taskId) throw new Error(`万相未返回任务ID：${JSON.stringify(data).slice(0, 200)}`)
    return taskId
  }

  /** 轮询任务结果，返回图片 URL */
  async _pollTask(taskId) {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 3000))
      const data = await this._request(`/tasks/${taskId}`, {})
      const status = data?.output?.task_status
      if (status === 'SUCCEEDED') {
        const results = data?.output?.results || []
        const url = results[0]?.url
        if (!url) throw new Error('万相任务成功但未返回图片 URL')
        return url
      }
      if (status === 'FAILED' || status === 'CANCELED') {
        throw new Error(`万相任务失败（${status}）：${data?.output?.message || ''}`)
      }
      // PENDING / RUNNING 继续轮询
    }
    throw new Error('万相任务超时（3 分钟未完成）')
  }

  /** 尺寸映射：万相支持 1024*1024 等固定比例 */
  _sizeFor(width, height) {
    const ratio = width / height
    if (ratio > 1.2) return '1280*720'
    if (ratio < 0.82) return '720*1280'
    return '1024*1024'
  }

  async generateImage({ prompt, width = 1080, height = 1920, model = 'wanx-v1' }) {
    if (!this.apiKey) throw new Error('未配置 DASHSCOPE_API_KEY')
    const size = this._sizeFor(width, height)
    const taskId = await this._submitTask(prompt, size, model)
    const url = await this._pollTask(taskId)
    return { mock: false, model, url, provider: 'dashscope' }
  }
}
