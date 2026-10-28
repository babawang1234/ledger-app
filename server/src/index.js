import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { config } from './config/index.js'
import { migrate } from './lib/db.js'
import { errorHandler, notFound } from './middleware/error.js'

import authRoutes from './routes/auth.js'
import accountRoutes from './routes/account.js'
import projectRoutes from './routes/projects.js'
import generationRoutes from './routes/generation.js'
import templateRoutes from './routes/templates.js'
import uploadRoutes from './routes/upload.js'
import adminRoutes from './routes/admin.js'
import assetRoutes from './routes/assets.js'
import inspireRoutes from './routes/inspire.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 初始化数据库
migrate()
fs.mkdirSync(config.uploadDir, { recursive: true })
fs.mkdirSync(config.exportDir, { recursive: true })

const app = express()

app.use(cors({ origin: config.clientOrigin, credentials: true }))
app.use(express.json({ limit: '10mb' }))

// 静态文件：上传与导出
app.use('/uploads', express.static(config.uploadDir))
app.use('/exports', express.static(config.exportDir))
app.use('/templates', express.static(path.resolve(__dirname, '../public/templates')))
app.use('/generated', express.static(path.resolve(__dirname, '../public/generated')))

app.get('/api/health', (req, res) => res.json({ ok: true, env: config.env }))

app.use('/api/auth', authRoutes)
app.use('/api/account', accountRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/generate', generationRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/assets', assetRoutes)
app.use('/api/inspire', inspireRoutes)

app.use(notFound)
app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`[server] AI 海报工作台已启动：http://localhost:${config.port}`)
  console.log(`[server] 环境：${config.env}`)
})

export default app
