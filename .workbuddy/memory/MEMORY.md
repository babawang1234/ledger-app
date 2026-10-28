# 项目长期约定（幻象工坊 · AI 海报设计工作台）

## 技术栈与端口（不可变）
- 前端 React18+Vite+Tailwind :5173 / 后端 Express+better-sqlite3+@napi-rs/canvas :4000
- 数据库 SQLite（server/data/app.db，seed 重建）；品牌占位名「幻象工坊」

## 核心机制
- 文字独立图层渲染 renderer.js；版式 layouts.js；模板 template-cases.js+render-templates.js
- 模板检索 GET /api/templates/discover（花瓣式，seed 换一换）
- 模型层全走后端；额度账本预扣/退款幂等

## 演示账号
- demo@example.com/demo123456 ；admin@example.com/admin123456

## 用户偏好
- 深色科技感 + 紫蓝渐变；重视真实可用 vs 演示明确标注；不虚构数据/评价
- 参照花瓣网检索交互（关键词直出大量可编辑模板 + 换一换）
