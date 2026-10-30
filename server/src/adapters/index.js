import { modelRegistry } from './registry.js'
import { MockAdapter } from './mock.js'
import { DeepSeekAdapter } from './deepseek.js'
import { OpenAIAdapter } from './openai.js'
import { WanxAdapter } from './wanx.js'
import { ZhipuAdapter } from './zhipu.js'
import { StockAdapter } from './stock.js'
import { HttpError } from '../lib/http.js'

/**
 * 统一 Model Adapter —— 前端绝不直接调用供应商，全部经此后端路由。
 * - 自动路由：按能力 + 可用性 + 成本排序选择
 * - 手动选择：专业用户可指定 model id
 * - 能力分发：text / image_input / image_generation / image_edit
 */

const adapters = {
  mock: new MockAdapter(),
  deepseek: new DeepSeekAdapter(),
  openai: new OpenAIAdapter(),
  wanx: new WanxAdapter(),
  zhipu: new ZhipuAdapter(),
  stock: new StockAdapter(),
}

function adapterFor(provider) {
  const a = adapters[provider]
  if (!a) throw new HttpError(400, `未知供应商：${provider}`)
  return a
}

function isProviderAvailable(provider) {
  const a = adapters[provider]
  if (provider === 'mock') return true
  return a.available
}
export function autoRoute(capability, { userModelTier = 'basic', exclude = [] } = {}) {
  const candidates = modelRegistry
    .byCapability(capability)
    .filter((m) => !exclude.includes(m.id) && m.provider !== 'stock')
    .filter((m) => isProviderAvailable(m.provider)) // 关键：无凭据的供应商不可被路由
    .sort((a, b) => {
      const aReal = !a.is_mock
      const bReal = !b.is_mock
      if (aReal !== bReal) return aReal ? -1 : 1 // 优先真实模型
      return a.price_per_unit - b.price_per_unit
    })
  return candidates[0] || null
}

/** 手动指定模型 */
export function routeById(modelId, capability) {
  const m = modelRegistry.get(modelId) || modelRegistry.getByModelId(modelId)
  if (!m) throw new HttpError(404, `模型不存在：${modelId}`)
  if (!m.capabilities.includes(capability)) {
    throw new HttpError(400, `模型 ${m.display_name} 不支持能力 ${capability}`)
  }
  if (m.is_mock) return m
  if (!isProviderAvailable(m.provider)) {
    throw new HttpError(503, `供应商 ${m.provider} 未配置凭据，请使用演示模型`)
  }
  return m
}

export async function invoke(modelRow, capability, payload) {
  const adapter = adapterFor(modelRow.provider)
  switch (capability) {
    case 'text':
      return adapter.text(payload)
    case 'image_input':
      return adapter.analyzeImage(payload)
    case 'image_generation':
      return adapter.generateImage(payload)
    case 'image_edit':
      // 编辑能力复用 generateImage，占位实现
      return adapter.generateImage(payload)
    default:
      throw new HttpError(400, `未知能力：${capability}`)
  }
}

export { modelRegistry, isProviderAvailable }
