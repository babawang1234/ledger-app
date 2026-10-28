# 项目协作与恢复指南

> 幻象工坊 · AI 海报设计工作台（占位品牌名，可全局替换）

这份文档说明：如何换网络/换电脑后，快速恢复本项目并继续和我协作更新。

---

## 一、换电脑后如何恢复

### 1. 克隆代码
```bash
git clone https://github.com/babawang1234/ledger-app.git
cd ledger-app
```

### 2. 安装依赖
```bash
npm install          # 根依赖（workspace 编排）
cd server && npm install   # 后端依赖（含 better-sqlite3、@napi-rs/canvas 原生模块）
cd ../client && npm install # 前端依赖
```

> 原生模块（`better-sqlite3`、`@napi-rs/canvas`）在不同平台/Node 版本下会自动编译，
> 若编译失败请确认本机已安装 C++ 构建工具链。

### 3. 配置环境变量
```bash
cd server
cp .env.example .env
# 按需填写真实 API Key；不填则系统自动回退 mock 演示模式
```

### 4. 初始化数据并启动
```bash
cd server && node src/seed.js    # 重建数据库 + 渲染 24 个模板海报
node src/index.js                 # 启动后端（:4000）

# 另开终端启动前端
cd client && npx vite --port 5173 # 启动前端（:5173）
```

访问 http://localhost:5173

---

## 二、演示账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 演示用户 | `demo@example.com` | `demo123456` |
| 管理员 | `admin@example.com` | `admin123456` |

---

## 三、与我协作的约定（重要）

为了换设备后我能无缝接续，请每次开工前让我先读这三份「记忆」文件，或直接告诉我"继续上次的项目"：

1. **`.workbuddy/memory/MEMORY.md`** —— 项目长期约定（技术栈、品牌、端口、核心机制）
2. **`.workbuddy/memory/YYYY-MM-DD.md`** —— 每日工作日志（已随仓库提交）
3. **`COLLABORATION.md`** —— 本文件

### 技术栈与端口（不可变约定）
- 前端：React 18 + Vite + Tailwind，端口 **5173**
- 后端：Node + Express + better-sqlite3 + @napi-rs/canvas，端口 **4000**
- 数据库：SQLite（`server/data/app.db`，由 seed 重建）
- 品牌占位名：**幻象工坊**（全局可替换）

### 核心机制（切勿破坏）
- **文字独立图层渲染**：`server/src/lib/renderer.js`，中文文字绝不靠图像模型画
- **版式生成**：`server/src/lib/layouts.js`（4 种构图方案）
- **模板案例**：`server/src/lib/template-cases.js` + `render-templates.js`
- **模板检索**：`GET /api/templates/discover`（花瓣式关键词检索）
- **模型层**：Model Registry + Adapter，全部走后端，浏览器不直连供应商
- **额度账本**：预扣 → 结算/退款，幂等

---

## 四、安全约定

- `.env`、`server/data/*.db`、`node_modules/` 已加入 `.gitignore`，**绝不提交**
- 真实 API Key 只放 `server/.env`（本地），不写进任何提交文件
- 模板海报 PNG 已纳入版本管理（原创资产，换电脑后灵感库立即可用）

---

## 五、当前进度快照（截至 2026-10-28）

- ✅ 7 个页面：首页 / 创作台 / 灵感库 / 价格 / 作品库 / 账户 / 管理后台
- ✅ 描述式创作 + 花瓣式关键词检索（`/templates/discover`）
- ✅ 24 个原创模板（12 案例 × 主版 + B 版）
- ✅ 额度账本、订阅套餐、模型注册表、管理后台
- ⏳ 真实模型 API 未接入（当前 mock 演示，已全程标注）
- ⏳ 支付未接通（购买按钮标注"暂未开放"）
- ⏳ Unsplash/Pexels 图库需配置 Key 后启用

---

## 六、下一步可选方向

1. 接入真实模型（DeepSeek/OpenAI 官方 API）
2. 接通支付
3. 灵感库模板批量导入（管理后台）
4. 图层编辑器增强（拖拽、对齐吸附）
