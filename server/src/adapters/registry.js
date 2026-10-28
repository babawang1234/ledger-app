import { db } from '../lib/db.js'
import { genId } from '../lib/util.js'

/**
 * 模型注册表（Model Registry）
 * 所有模型配置从数据库读取，UI 不硬编码模型 ID。
 * 能力分类：text | image_input | image_generation | image_edit
 */
export class ModelRegistry {
  list({ enabledOnly = true } = {}) {
    const rows = db
      .prepare(
        `SELECT * FROM models ${enabledOnly ? 'WHERE enabled = 1' : ''} ORDER BY sort_order, id`
      )
      .all()
    return rows.map((m) => ({
      ...m,
      capabilities: JSON.parse(m.capabilities || '[]'),
      is_mock: !!m.is_mock,
      enabled: !!m.enabled,
    }))
  }

  get(id) {
    const row = db.prepare('SELECT * FROM models WHERE id = ?').get(id)
    if (!row) return null
    return {
      ...row,
      capabilities: JSON.parse(row.capabilities || '[]'),
      is_mock: !!row.is_mock,
      enabled: !!row.enabled,
    }
  }

  getByModelId(modelId) {
    const row = db.prepare('SELECT * FROM models WHERE model_id = ?').get(modelId)
    if (!row) return null
    return {
      ...row,
      capabilities: JSON.parse(row.capabilities || '[]'),
      is_mock: !!row.is_mock,
      enabled: !!row.enabled,
    }
  }

  byCapability(capability) {
    return this.list({ enabledOnly: true }).filter((m) =>
      m.capabilities.includes(capability)
    )
  }

  upsert(model) {
    const existing = db.prepare('SELECT id FROM models WHERE provider = ? AND model_id = ?').get(
      model.provider,
      model.model_id
    )
    if (existing) {
      db.prepare(
        `UPDATE models SET display_name=@display_name, capabilities=@capabilities,
         price_per_unit=@price_per_unit, unit_label=@unit_label, est_wait_seconds=@est_wait_seconds,
         enabled=@enabled, is_mock=@is_mock, sort_order=@sort_order WHERE id=@id`
      ).run({ ...model, capabilities: JSON.stringify(model.capabilities), id: existing.id })
      return existing.id
    }
    const id = model.id || genId('model')
    db.prepare(
      `INSERT INTO models (id, provider, model_id, display_name, capabilities, price_per_unit,
        unit_label, est_wait_seconds, enabled, is_mock, sort_order)
       VALUES (@id, @provider, @model_id, @display_name, @capabilities, @price_per_unit,
        @unit_label, @est_wait_seconds, @enabled, @is_mock, @sort_order)`
    ).run({ ...model, id, capabilities: JSON.stringify(model.capabilities) })
    return id
  }

  setEnabled(id, enabled) {
    db.prepare('UPDATE models SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id)
  }
}

export const modelRegistry = new ModelRegistry()
