import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { config } from '../config/index.js'

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true })

export const db = new Database(config.dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user',           -- user | admin
      plan TEXT NOT NULL DEFAULT 'free',           -- free | personal | pro | studio
      subscription_status TEXT NOT NULL DEFAULT 'none', -- none | active | past_due | canceled
      subscription_ends_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,           -- free | personal | pro | studio
      name TEXT NOT NULL,
      price_monthly REAL NOT NULL DEFAULT 0,
      credits_per_period INTEGER NOT NULL DEFAULT 0,
      export_quality TEXT NOT NULL DEFAULT 'png_2x',
      model_tier TEXT NOT NULL DEFAULT 'basic',
      team_seats INTEGER NOT NULL DEFAULT 1,
      features TEXT NOT NULL DEFAULT '[]',  -- JSON 数组
      enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS credit_packs (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      credits INTEGER NOT NULL,
      price REAL NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );

    -- 额度账本：type = period(周期额度) | topup(充值) | consume(消耗) | refund(失败返还) | adjust(人工调整)
    CREATE TABLE IF NOT EXISTS credit_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,             -- 正数为增加，负数为扣减
      balance_after INTEGER NOT NULL,
      ref_type TEXT,                       -- 关联业务类型：generation | subscription | pack | manual
      ref_id TEXT,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 模型注册表：能力 = text | image_input | image_generation | image_edit
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,              -- deepseek | openai | mock
      model_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      capabilities TEXT NOT NULL DEFAULT '[]', -- JSON 数组
      price_per_unit REAL NOT NULL DEFAULT 0,  -- 每单位额度
      unit_label TEXT NOT NULL DEFAULT '次',
      est_wait_seconds INTEGER NOT NULL DEFAULT 30,
      enabled INTEGER NOT NULL DEFAULT 1,
      is_mock INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(provider, model_id)
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      purpose TEXT,
      canvas_ratio TEXT,
      canvas_width INTEGER,
      canvas_height INTEGER,
      resolution TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS generation_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT,
      model_id TEXT NOT NULL,             -- 关联 models.id
      provider TEXT NOT NULL,
      capability TEXT NOT NULL,
      params TEXT NOT NULL DEFAULT '{}',  -- JSON
      status TEXT NOT NULL DEFAULT 'pending', -- pending | running | succeeded | failed | refunded
      cost_credits INTEGER NOT NULL DEFAULT 0,
      idempotency_key TEXT,
      error TEXT,
      started_at TEXT,
      finished_at TEXT,
      duration_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS layouts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      layers TEXT NOT NULL DEFAULT '[]',  -- JSON：文字/图片/形状图层
      canvas TEXT NOT NULL DEFAULT '{}',  -- JSON：画布信息
      background TEXT NOT NULL DEFAULT '{}', -- JSON：背景
      style_analysis TEXT,                -- JSON：风格分析
      thumbnail_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      layout_id TEXT,
      format TEXT NOT NULL,
      size_label TEXT NOT NULL,
      file_path TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      purpose TEXT,                         -- 用途：活动/电商/社媒/品牌…
      description TEXT,                     -- 设计说明
      design_notes TEXT NOT NULL DEFAULT '{}', -- JSON：配色/标题层级/构图/适用场景
      sample_content TEXT NOT NULL DEFAULT '{}', -- JSON：带入创作台的示例文案与参数
      thumbnail_path TEXT,                  -- 海报预览图（本地）
      layers TEXT NOT NULL DEFAULT '[]',
      canvas TEXT NOT NULL DEFAULT '{}',
      background TEXT NOT NULL DEFAULT '{}',
      tags TEXT NOT NULL DEFAULT '[]',
      featured INTEGER NOT NULL DEFAULT 0,
      badge TEXT,                           -- 官方示例 / 编辑精选
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_ledger_user ON credit_ledger(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_user ON generation_tasks(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_layouts_project ON layouts(project_id);
    CREATE INDEX IF NOT EXISTS idx_exports_user ON exports(user_id, created_at);
  `)
}
