// 一键初始化：复制环境变量示例、安装依赖、初始化数据库
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')

// 1. 环境变量
const envSrc = path.join(root, 'server/.env.example')
const envDst = path.join(root, 'server/.env')
if (!fs.existsSync(envDst)) {
  fs.copyFileSync(envSrc, envDst)
  console.log('[setup] 已复制 server/.env.example → server/.env（请按需填写模型 API Key）')
} else {
  console.log('[setup] server/.env 已存在，跳过')
}

console.log(`
✅ 初始化完成。下一步：

  1. npm install          # 安装依赖
  2. npm run seed         # 初始化数据库（管理员/套餐/模型/模板）
  3. npm run dev          # 启动前后端开发服务

  前端: http://localhost:5173
  后端: http://localhost:4000

  管理员: admin@example.com / admin123456（见 server/.env）
  演示用户: demo@example.com / demo123456

  注意：未配置真实模型 API Key 时，系统使用 mock provider 演示完整流程。
`)
