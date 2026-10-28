import { db } from '../lib/db.js'
import { genId, now } from '../lib/util.js'
import { HttpError } from '../lib/http.js'

export function createProject(userId, { name, purpose, canvasRatio, canvasWidth, canvasHeight, resolution }) {
  const id = genId('proj')
  db.prepare(
    `INSERT INTO projects (id, user_id, name, purpose, canvas_ratio, canvas_width, canvas_height, resolution)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, name, purpose || null, canvasRatio || null, canvasWidth || null, canvasHeight || null, resolution || null)
  return getProject(userId, id)
}

export function getProject(userId, projectId) {
  const p = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId)
  if (!p) throw new HttpError(404, '项目不存在')
  return p
}

export function listProjects(userId, { limit = 100, offset = 0 } = {}) {
  return db
    .prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?')
    .all(userId, limit, offset)
}

export function updateProject(userId, projectId, patch) {
  const p = getProject(userId, projectId)
  const allowed = ['name', 'purpose', 'canvas_ratio', 'canvas_width', 'canvas_height', 'resolution', 'status']
  const sets = []
  const vals = []
  for (const k of allowed) {
    if (patch[k] !== undefined) {
      sets.push(`${k} = ?`)
      vals.push(patch[k])
    }
  }
  if (sets.length) {
    sets.push(`updated_at = datetime('now')`)
    db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...vals, projectId)
  }
  return getProject(userId, projectId)
}

export function deleteProject(userId, projectId) {
  getProject(userId, projectId)
  db.prepare('DELETE FROM layouts WHERE project_id = ?').run(projectId)
  db.prepare('DELETE FROM exports WHERE project_id = ?').run(projectId)
  db.prepare('DELETE FROM projects WHERE id = ?').run(projectId)
  return { deleted: true }
}
