import { config } from './config/index.js'
import { migrate, db } from './lib/db.js'
import { hashPassword } from './services/auth.js'
import { genId } from './lib/util.js'
import { modelRegistry } from './adapters/registry.js'
import { upsertPlan, upsertPack } from './services/plans.js'
import { grantPeriod } from './services/ledger.js'

migrate()

// ---- 管理员 ----
const adminEmail = config.admin.email
const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail)
if (!existingAdmin) {
  const id = genId('usr')
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, plan) VALUES (?, ?, ?, '管理员', 'admin', 'studio')`
  ).run(id, adminEmail, hashPassword(config.admin.password))
  console.log(`[seed] 管理员已创建：${adminEmail} / ${config.admin.password}`)
}

// ---- 演示用户 ----
const demoEmail = 'demo@example.com'
if (!db.prepare('SELECT id FROM users WHERE email = ?').get(demoEmail)) {
  const id = genId('usr')
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, plan, subscription_status) VALUES (?, ?, ?, '演示用户', 'user', 'pro', 'active')`
  ).run(id, demoEmail, hashPassword('demo123456'))
  grantPeriod({ userId: id, amount: 200, refType: 'subscription', refId: id, note: '演示用户初始额度' })
  console.log(`[seed] 演示用户已创建：${demoEmail} / demo123456`)
}

// ---- 订阅套餐（后台可配置，非硬编码） ----
upsertPlan({ key: 'free', name: '免费体验', price_monthly: 0, credits_per_period: 20, export_quality: 'png_1x', model_tier: 'basic', team_seats: 1, features: ['20 额度/月', 'PNG 导出（1x）', '版式方案生成', '基础图层编辑'], enabled: 1, sort_order: 0 })
upsertPlan({ key: 'personal', name: '个人版', price_monthly: 39, credits_per_period: 200, export_quality: 'png_2x', model_tier: 'standard', team_seats: 1, features: ['200 额度/月', 'PNG/JPG 导出（2x）', '参考图风格分析', '4 种版式方案', '文案润色'], enabled: 1, sort_order: 1 })
upsertPlan({ key: 'pro', name: '专业版', price_monthly: 99, credits_per_period: 600, export_quality: 'png_2x', model_tier: 'advanced', team_seats: 1, features: ['600 额度/月', 'PNG/JPG 导出（2x）', '多尺寸一键适配', '模型手动选择', '全部版式与风格'], enabled: 1, sort_order: 2 })
upsertPlan({ key: 'studio', name: '工作室版', price_monthly: 299, credits_per_period: 2500, export_quality: 'png_4x', model_tier: 'enterprise', team_seats: 1, features: ['2500 额度/月', '最高导出质量（4x）', '全部模型与能力', '优先生成队列', '多尺寸一键适配'], enabled: 1, sort_order: 3 })

// ---- 额度包 ----
upsertPack({ key: 'pack_100', name: '100 额度', credits: 100, price: 19, enabled: 1 })
upsertPack({ key: 'pack_500', name: '500 额度', credits: 500, price: 79, enabled: 1 })
upsertPack({ key: 'pack_2000', name: '2000 额度', credits: 2000, price: 269, enabled: 1 })

// ---- 模型注册表 ----
// 文本模型（DeepSeek 官方，占位符，未配置 Key 时不可用）
modelRegistry.upsert({ provider: 'deepseek', model_id: 'deepseek-v4-pro', display_name: 'DeepSeek V4 Pro（文本）', capabilities: ['text'], price_per_unit: 2, unit_label: '次', est_wait_seconds: 10, enabled: 1, is_mock: 0, sort_order: 1 })
// DeepSeek 官方支持图像输入的多模态 Flash 模型
modelRegistry.upsert({ provider: 'deepseek', model_id: 'deepseek-flash', display_name: 'DeepSeek Flash（视觉分析）', capabilities: ['image_input'], price_per_unit: 2, unit_label: '次', est_wait_seconds: 15, enabled: 1, is_mock: 0, sort_order: 2 })
// OpenAI 文本
modelRegistry.upsert({ provider: 'openai', model_id: 'gpt-4o-mini', display_name: 'GPT-4o mini（文本）', capabilities: ['text'], price_per_unit: 2, unit_label: '次', est_wait_seconds: 8, enabled: 1, is_mock: 0, sort_order: 3 })
// OpenAI GPT Image 官方图像生成模型
modelRegistry.upsert({ provider: 'openai', model_id: 'gpt-image-1', display_name: 'GPT Image 1（高质量图像）', capabilities: ['image_generation', 'image_edit'], price_per_unit: 18, unit_label: '次', est_wait_seconds: 50, enabled: 1, is_mock: 0, sort_order: 4 })
// 通义万相（阿里云百炼）国内文生图，中文 prompt 友好，支持海报
modelRegistry.upsert({ provider: 'wanx', model_id: 'wanx-v1', display_name: '通义万相（文生图）', capabilities: ['image_generation'], price_per_unit: 6, unit_label: '次', est_wait_seconds: 30, enabled: 1, is_mock: 0, sort_order: 5 })
// 使用图库照片的确定性海报渲染，不调用图像生成 API
modelRegistry.upsert({ provider: 'stock', model_id: 'stock-renderer', display_name: '图库摄影排版（不调用图像生成模型）', capabilities: ['image_generation', 'image_edit'], price_per_unit: 5, unit_label: '次', est_wait_seconds: 8, enabled: 1, is_mock: 0, sort_order: 6 })
// Mock 演示模型（始终可用，明确标注）
modelRegistry.upsert({ provider: 'mock', model_id: 'mock-text', display_name: '演示文本模型（Mock）', capabilities: ['text'], price_per_unit: 1, unit_label: '次', est_wait_seconds: 1, enabled: 1, is_mock: 1, sort_order: 100 })
modelRegistry.upsert({ provider: 'mock', model_id: 'mock-vision', display_name: '演示视觉分析（Mock）', capabilities: ['image_input'], price_per_unit: 2, unit_label: '次', est_wait_seconds: 1, enabled: 1, is_mock: 1, sort_order: 101 })
modelRegistry.upsert({ provider: 'mock', model_id: 'mock-image-gen', display_name: '演示图像生成（Mock）', capabilities: ['image_generation', 'image_edit'], price_per_unit: 3, unit_label: '次', est_wait_seconds: 1, enabled: 1, is_mock: 1, sort_order: 102 })

// ---- 灵感库模板（原创案例，含真实海报渲染） ----
const templateCount = db.prepare('SELECT COUNT(*) AS c FROM templates').get().c
if (templateCount === 0) {
  const { TEMPLATE_CASES } = await import('./lib/template-cases.js')
  const { renderTemplateCases } = await import('./lib/render-templates.js')
  const rendered = await renderTemplateCases()
  const bySlug = new Map(rendered.map((r) => [r.slug, r]))

  for (const c of TEMPLATE_CASES) {
    const baseSlug = c.name.replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    for (const isAlt of [false, true]) {
      const r = bySlug.get(isAlt ? `${baseSlug}-alt` : baseSlug)
      db.prepare(
        `INSERT INTO templates (id, name, category, purpose, description, design_notes, sample_content,
          thumbnail_path, layers, canvas, background, tags, featured, badge)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        genId('tpl'),
        isAlt ? `${c.name} · B 版` : c.name,
        c.category,
        c.purpose,
        c.description,
        JSON.stringify(c.designNotes),
        JSON.stringify(c.content),
        r?.imageUrl || null,
        JSON.stringify(r?.layers || []),
        JSON.stringify(c.canvas),
        JSON.stringify(r?.background || {}),
        JSON.stringify(isAlt ? [...c.tags, 'B版'] : c.tags),
        isAlt ? 0 : c.featured,
        c.badge
      )
    }
  }
  console.log(`[seed] 已创建 ${TEMPLATE_CASES.length * 2} 个原创案例（含 B 版与海报渲染）`)
}

console.log('[seed] 初始化完成')
process.exit(0)
