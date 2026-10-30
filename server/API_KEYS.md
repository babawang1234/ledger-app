# 免费 API Key 注册教程（3 分钟搞定）

本项目「面向大众」时，素材图、设计底图、AI 生图都建议配置下面的免费 Key。
**全部免费、国内直连、中文友好**，不填也能跑（自动降级到本地图库 + Pollinations），但填了体验天差地别。

> ⚠️ 所有 Key 只填在 `server/.env`，绝不出现在前端代码，也绝不要提交到 Git。

---

## 一、智谱 AI 生图 Key（最重要，解决「生图一模一样 / 外国图」）

**模型**：CogView-3-Flash —— 官方价目表「免费」档，永久免费，中文 prompt 理解强，一次可生成多张真正不同的图。

**注册步骤**：
1. 打开 https://open.bigmodel.cn/ ，用手机号注册登录
2. 登录后点右上角头像 → 「API Key」页面（或直接访问 https://open.bigmodel.cn/usercenter/apikeys ）
3. 点「添加新的 API Key」，复制生成的 key

**填写**：在 `server/.env` 里填入：
```
ZHIPU_API_KEY=你的key
```

> 注意：免费档有并发/速率限制（高峰期可能排队）。本项目已内置「落盘缓存 + 关键词复用」，同一关键词只消耗一次额度，后续直接复用缓存图。

---

## 二、Pixabay 图库 Key（解决「搜不到中文素材 / 都是外国图」）

**说明**：Pixabay 是免费可商用图库，有中文界面和大量中文场景素材，是最省心的图库接入方案。

**注册步骤**：
1. 打开 https://pixabay.com/api/docs/ ，注册账号（邮箱即可）
2. 页面会直接显示你的 API Key，复制即可

**填写**：在 `server/.env` 里填入：
```
PIXABAY_API_KEY=你的key
```

---

## 三、（可选）阿里云百炼 / 通义万相 Key

**说明**：通义万相文生图，新用户实名认证后送免费额度，中文国风理解极强，适合生成国风海报底图。

**注册步骤**：
1. 打开 https://bailian.console.aliyun.com/ ，登录阿里云账号并完成实名认证
2. 左侧「API-KEY 管理」→ 创建 API Key
3. 复制后填入 `server/.env` 的 `DASHSCOPE_API_KEY`

---

## 四、填完后如何生效

```bash
# 重启后端服务
cd server
npm run dev
```

重启后，搜索素材会自动走 Pixabay（中文素材），AI 生图会自动走智谱（多张不同图）。
如果某个 Key 没填，系统会自动降级，不会报错。
