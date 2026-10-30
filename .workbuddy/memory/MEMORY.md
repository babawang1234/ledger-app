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
- 产品面向大众（非自用），免费API需配合缓存复用扛并发

## 素材/AI生图架构（2026-10 确定）
- AI生图三层：gen-cache落盘缓存 → 智谱CogView-3-Flash(免费,中文,真多图) → Pollinations兜底(像素变体)
- 素材图：Pixabay(免费可商用,中文) + Pexels/Unsplash + 本地图库池(239张)
- 设计底图：searchDesignAssets(Pixabay abstract/pattern) 优先，generateDesignBackdrops程序化兜底
- Key 全空时自动降级；Key 填在 server/.env（ZHIPU_API_KEY / PIXABAY_API_KEY）
- 注册教程见 server/API_KEYS.md
- 重要教训：花瓣/站酷无开放API且不可商用，不要硬扒；免费额度扛不住公共并发，必须缓存复用
