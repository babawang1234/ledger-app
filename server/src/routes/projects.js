import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import { asyncHandler } from '../lib/http.js'
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
} from '../services/projects.js'
import {
  listLayouts,
  getLayout,
  updateLayout,
  saveLayout,
  exportLayout,
  listExports,
} from '../services/generation.js'

const router = Router()
router.use(authRequired)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ projects: listProjects(req.user.id) })
  })
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, purpose, canvasRatio, canvasWidth, canvasHeight, resolution } = req.body
    if (!name) return res.status(400).json({ error: 'VALIDATION', message: '项目名称不能为空' })
    const project = createProject(req.user.id, { name, purpose, canvasRatio, canvasWidth, canvasHeight, resolution })
    res.status(201).json({ project })
  })
)

router.get(
  '/:projectId',
  asyncHandler(async (req, res) => {
    res.json({ project: getProject(req.user.id, req.params.projectId) })
  })
)

router.patch(
  '/:projectId',
  asyncHandler(async (req, res) => {
    const project = updateProject(req.user.id, req.params.projectId, req.body)
    res.json({ project })
  })
)

router.delete(
  '/:projectId',
  asyncHandler(async (req, res) => {
    res.json(deleteProject(req.user.id, req.params.projectId))
  })
)

// 版式
router.get(
  '/:projectId/layouts',
  asyncHandler(async (req, res) => {
    res.json({ layouts: listLayouts(req.user.id, req.params.projectId) })
  })
)

router.post(
  '/:projectId/layouts',
  asyncHandler(async (req, res) => {
    const { name, layers, canvas, background, styleAnalysis } = req.body
    const layout = saveLayout({
      projectId: req.params.projectId,
      userId: req.user.id,
      name: name || '未命名版式',
      layers: layers || [],
      canvas: canvas || {},
      background: background || null,
      styleAnalysis: styleAnalysis || null,
    })
    res.status(201).json({ layout })
  })
)

router.get(
  '/:projectId/layouts/:layoutId',
  asyncHandler(async (req, res) => {
    res.json({ layout: getLayout(req.user.id, req.params.layoutId) })
  })
)

router.patch(
  '/:projectId/layouts/:layoutId',
  asyncHandler(async (req, res) => {
    const layout = updateLayout(req.user.id, req.params.layoutId, req.body)
    res.json({ layout })
  })
)

router.post(
  '/:projectId/layouts/:layoutId/export',
  asyncHandler(async (req, res) => {
    const { format = 'png', sizeLabel = '原始尺寸', scale = 1 } = req.body
    const result = await exportLayout({
      userId: req.user.id,
      projectId: req.params.projectId,
      layoutId: req.params.layoutId,
      format,
      sizeLabel,
      scale: parseFloat(scale) || 1,
    })
    res.json({ export: result })
  })
)

router.get(
  '/:projectId/exports',
  asyncHandler(async (req, res) => {
    res.json({ exports: listExports(req.user.id) })
  })
)

export default router
