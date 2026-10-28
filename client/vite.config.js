import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/exports': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // 后端灵感库案例图（与前端 /templates 路由同名，用精确文件后缀区分）
      '/templates/': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
