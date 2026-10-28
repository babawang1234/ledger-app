# 幻象工坊 · 中文 AI 海报设计工作台（MVP）

> 上传参考图和文案，生成文字准确、可编辑、适配多尺寸的海报方案。
> 品牌名「幻象工坊」为可配置占位名，可在 `client/index.html`、`Navbar.jsx`、`Footer.jsx` 中全局替换。

## 快速开始

```bash
npm install          # 安装全部依赖（含 server / client workspaces）
npm run seed         # 初始化数据库（管理员、套餐、模型注册表、灵感库模板）
npm run dev          # 同时启动后端 :4000 与前端 :5173
```

- 前端：http://localhost:5173
- 后端：http://localhost:4000/api/health
- 管理员：`admin@example.com / admin123456`（`server/.env` 可改）
- 演示用户：`demo@example.com / demo123456`

环境变量：复制 `server/.env.example` 为 `server/.env`，按需填写模型 API Key。要用真实摄影底图搜索，另外申请并配置 `UNSPLASH_ACCESS_KEY`。未配置密钥时相关入口明确提示未配置，不伪装成真实搜索或生成。

## 页面

| 路由 | 说明 |
|---|---|
| `/` | 首页（介绍 + CTA） |
| `/studio` | 创作工作台（6 步流程：项目 → 参考图 → 内容 → 模型 → 方案 → 编辑导出） |
| `/templates` | 灵感库（原创模板） |
| `/pricing` | 价格页（订阅套餐 + 额度包，均后台可配） |
| `/projects` | 作品库（项目历史） |
| `/account` | 账户与账单（订阅、额度流水、消费记录、自助取消续费） |
| `/admin` | 管理后台（模型注册表、套餐配置、用户、人工额度调整） |

## 核心设计

### 文字精准（排版引擎）
图中文字全部由后端排版引擎（`@napi-rs/canvas`）作为**独立文字层**渲染，绝不依赖图像模型把中文画入图片。浏览器端 `PosterCanvas` 组件与后端渲染同构，所见即所得。

### 灵感库（真实原创案例）
10 个官方原创案例（`server/src/lib/template-cases.js` 定义），由排版引擎渲染为真实 PNG 存于 `server/public/templates/`。每个案例含设计说明（配色/标题层级/构图/适用场景）与示例文案，「使用模板」可将尺寸、用途、风格参数与文案一键带入创作台。支持分类筛选、搜索与排序。

### 参考图只用于风格提取
上传的参考图仅用于提取配色/构图/字体气质等风格信号（分析项可编辑、可锁定带入生成参数），生成结果为原创构图。未接入真实视觉模型时分析结果明确标注「演示模式」。

### 模型层（后端统一代理）
- 浏览器**绝不**直接调用模型供应商，所有调用走后端 `server/src/adapters/`。
- Model Registry 数据库驱动：provider / model_id / 能力（text、image_input、image_generation、image_edit）/ 价格映射 / 启用状态 / 显示名称，全部后台可配，UI 不硬编码模型 ID。
- 能力分类：语言模型、视觉分析模型、图像生成模型、排版渲染服务视为不同能力。
- DeepSeek / OpenAI 仅接入其官方 API；ChatGPT 网页订阅不作为 API 使用。DeepSeek 官方 API 不提供图像生成，不可假设其具备图像能力。
- 海报技能包位于 `server/src/skills/poster/`，涵盖参考风格分析、主视觉艺术指导、版式规则和出图检查；说明见该目录 README。
- 素材搜索使用 Unsplash 官方 API，遵循热链、摄影师/Unsplash 署名和素材选择下载事件要求；原图仅在渲染期间临时读取。
- 当前真实图像生成可配置 OpenAI GPT Image 1 API；DeepSeek V4 Pro 用于文本，DeepSeek Flash 用于视觉分析。API Key、模型用量另行计费，不能用 ChatGPT 网页订阅替代。
- 自动路由会**跳过无凭据的供应商**；模型列表中未配置凭据的模型显示「未配置」且不可选择。
- 手动选择模型为专业版/工作室版权益。
- 初始模型为配置占位符，部署前由管理员在 `/admin` 核验。

### 额度账本（Credit Ledger）
`server/src/services/ledger.js` 记录五类流水：周期额度、充值、消耗、失败返还、人工调整。生成任务采用**预扣 → 成功结算 / 失败退款**模式，支持幂等键避免重复扣款；平台侧失败自动返还额度。

### 订阅与可信度
免费体验 / 个人版 / 专业版 / 工作室版。套餐权益与当前真实功能对齐；支付未接入，购买按钮明确标注「暂未开放」；全程以「演示模式」标识 Mock 输出，不虚构用户评价、使用数据或商业承诺。

## 技术栈

单体 Web 应用（后端按模块拆分，无微服务）：
- **前端** React 18 + Vite + Tailwind CSS（深色科技感、紫蓝渐变、响应式、无障碍标签）
- **后端** Node.js + Express，模块化 services/routes/adapters
- **数据库** SQLite（better-sqlite3，WAL），生产可换 Postgres
- **认证** JWT + bcrypt
- **文件** 本地磁盘（`uploads/`、`exports/`），可换 S3/OSS
- **排版** @napi-rs/canvas（中文文字独立图层渲染）

## 目录结构

```
├── client/               # React 前端
│   └── src/
│       ├── pages/        # 7 个页面 + 登录/注册
│       ├── components/   # PosterCanvas、Navbar、Toast、States…
│       └── lib/          # API 客户端
├── server/
│   ├── src/
│   │   ├── adapters/     # Model Registry + Mock/DeepSeek/OpenAI/图库渲染 Adapter
│   │   ├── skills/poster/# 参考分析/艺术指导/版式/出图检查技能
│   │   ├── services/     # auth / projects / generation / ledger / plans
│   │   ├── lib/          # renderer（排版引擎）/ layouts / db
│   │   ├── routes/       # REST API
│   │   └── seed.js       # 初始化数据
│   └── .env.example      # 环境变量示例（无真实密钥）
└── scripts/setup.js
```

## 部署前检查清单

1. [ ] 管理员登录 `/admin`，核验各模型的官方 API 型号与能力（图片输入、图像生成）
2. [ ] `server/.env` 填入真实 API Key（仅服务端，绝不出现在前端）
3. [ ] 替换占位品牌名「幻象工坊」
4. [ ] `JWT_SECRET` 替换为强随机值
5. [ ] 配置后台套餐价格与额度
