import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { authRequired } from '../middleware/auth.js'
import { config } from '../config/index.js'
import { genId } from '../lib/util.js'

const router = Router()
router.use(authRequired)

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(config.uploadDir, { recursive: true })
    cb(null, config.uploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${genId('up')}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(png|jpe?g|webp|gif|svg|pdf)$/i
    if (allowed.test(file.originalname)) cb(null, true)
    else cb(new Error('仅支持 png/jpg/webp/gif/svg/pdf 文件'))
  },
})

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'VALIDATION', message: '未上传文件' })
  res.status(201).json({
    file: {
      id: genId('file'),
      filename: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      mimetype: req.file.mimetype,
      size: req.file.size,
    },
  })
})

export default router
