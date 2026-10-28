import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '604800',
  },
  dbPath: path.resolve(__dirname, '../../', process.env.DB_PATH || './data/app.db'),
  uploadDir: path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || './uploads'),
  exportDir: path.resolve(__dirname, '../../', process.env.EXPORT_DIR || './exports'),
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'admin123456',
  },
  providers: {
    unsplash: { accessKey: process.env.UNSPLASH_ACCESS_KEY || '' },
    pexels: { apiKey: process.env.PEXELS_API_KEY || '' },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    },
  },
  defaults: {
    textModel: process.env.DEFAULT_TEXT_MODEL || 'deepseek-chat',
    visionModel: process.env.DEFAULT_VISION_MODEL || 'deepseek-vl',
    imageModel: process.env.DEFAULT_IMAGE_MODEL || 'mock-image-gen',
  },
}
