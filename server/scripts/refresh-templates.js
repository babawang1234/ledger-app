import { db } from '../src/lib/db.js'
import { genId } from '../src/lib/util.js'
import { TEMPLATE_CASES } from '../src/lib/template-cases.js'
import { renderTemplateCases } from '../src/lib/render-templates.js'

const rendered = await renderTemplateCases()
const bySlug = new Map(rendered.map((item) => [item.slug, item]))
const find = db.prepare('SELECT id FROM templates WHERE name = ?')
const update = db.prepare(`
  UPDATE templates SET category = ?, purpose = ?, description = ?, design_notes = ?, sample_content = ?,
    thumbnail_path = ?, layers = ?, canvas = ?, background = ?, tags = ?, featured = ?, badge = ?
  WHERE id = ?
`)
const insert = db.prepare(`
  INSERT INTO templates (id, name, category, purpose, description, design_notes, sample_content,
    thumbnail_path, layers, canvas, background, tags, featured, badge)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

let updated = 0
for (const item of TEMPLATE_CASES) {
  const slug = item.name.replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
  const poster = bySlug.get(slug)
  if (!poster) continue
  const values = [
    item.category,
    item.purpose,
    item.description,
    JSON.stringify(item.designNotes),
    JSON.stringify(item.content),
    poster.imageUrl,
    JSON.stringify(poster.layers),
    JSON.stringify(item.canvas),
    JSON.stringify(poster.background),
    JSON.stringify(item.tags),
    item.featured,
    item.badge,
  ]
  const existing = find.get(item.name)
  if (existing) updated += update.run(...values, existing.id).changes
  else {
    insert.run(genId('tpl'), item.name, ...values)
    updated += 1
  }
}

console.log(`[templates] 已更新 ${updated}/${TEMPLATE_CASES.length} 个本地原创海报案例`)
db.close()
