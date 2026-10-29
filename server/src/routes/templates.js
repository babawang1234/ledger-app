import { Router } from 'express'
import { asyncHandler } from '../lib/http.js'
import { db } from '../lib/db.js'

const router = Router()

function serialize(t) {
  const layers = JSON.parse(t.layers || '[]')
  const photo = layers.find((layer) => layer.type === 'image' && /^https:\/\/images\.unsplash\.com\//.test(layer.src || ''))
  const credit = layers.find((layer) => layer.type === 'text' && layer.photographer)
  return {
    ...t,
    tags: JSON.parse(t.tags || '[]'),
    canvas: JSON.parse(t.canvas || '{}'),
    designNotes: JSON.parse(t.design_notes || '{}'),
    sampleContent: JSON.parse(t.sample_content || '{}'),
    featured: !!t.featured,
    stockAsset: photo && credit ? {
      id: photo.src.match(/photo-([a-zA-Z0-9-]+)/)?.[0] || 'curated-template-photo',
      provider: 'unsplash',
      sourceName: 'Unsplash',
      url: photo.src,
      photographer: credit.photographer,
      profileUrl: credit.sourceUrl,
      unsplashUrl: credit.unsplashUrl,
      sourceUrl: credit.unsplashUrl,
      templateStyle: photo.templateStyle,
      curated: true,
      license: 'Unsplash License',
    } : null,
  }
}

// 灵感库/模板列表（公开），支持分类筛选与搜索
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { category, q } = req.query
    let sql = 'SELECT * FROM templates'
    const conds = []
    const args = []
    if (category && category !== '全部') {
      conds.push('category = ?')
      args.push(category)
    }
    if (q) {
      conds.push('(name LIKE ? OR description LIKE ? OR tags LIKE ?)')
      const like = `%${q}%`
      args.push(like, like, like)
    }
    if (conds.length) sql += ' WHERE ' + conds.join(' AND ')
    sql += ' ORDER BY featured DESC, created_at DESC'
    const rows = db.prepare(sql).all(...args)
    res.json({ templates: rows.map(serialize) })
  })
)

// 分类列表（供筛选栏）：返回分类名 + 计数 + 一张示例缩略图
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const rows = db.prepare(`
      SELECT category AS name, COUNT(*) AS count,
        (SELECT thumbnail_path FROM templates t2 WHERE t2.category = templates.category ORDER BY featured DESC, id ASC LIMIT 1) AS cover
      FROM templates
      GROUP BY category
      ORDER BY count DESC, name ASC
    `).all()
    res.json({ categories: rows })
  })
)

// 关键词发现：花瓣网式检索——命中模板优先，不足时用推荐补齐；seed 控制换一换
router.get(
  '/discover',
  asyncHandler(async (req, res) => {
    const raw = String(req.query.q || '').trim().slice(0, 120)
    const seed = Number(req.query.seed) || 0
    const exclude = String(req.query.exclude || '').split(',').filter(Boolean).slice(0, 40)
    const category = String(req.query.category || '').trim()
    const limit = Math.min(Number(req.query.limit) || 12, 60)

    let all = db.prepare('SELECT * FROM templates').all().filter((t) => !exclude.includes(t.id))
    if (category) all = all.filter((t) => t.category === category)
    const tokens = raw
      .replace(/[，,。.!！?？；;\n]/gu, ' ')
      .split(/\s+/)
      .flatMap((token) => (token.length > 2 ? [token, token.slice(0, 2)] : [token]))
      .filter((token) => token.length >= 2)

    // 同义/近义词扩展：让「环境」「环保」等词能命中「绿色」「生态」「低碳」等标签
    const SYNONYMS = {
      '环境': ['环保', '绿色', '生态', '低碳', '公益'],
      '环保': ['环境', '绿色', '生态', '低碳', '植树', '公益'],
      '绿色': ['环保', '环境', '生态', '低碳', '植树'],
      '生态': ['环保', '环境', '绿色', '低碳', '森林'],
      '低碳': ['环保', '绿色', '环境', '生态'],
      '促销': ['大促', '秒杀', '折扣', '优惠', '特卖', '双11', '双十一'],
      '大促': ['促销', '秒杀', '折扣', '双十一'],
      '折扣': ['促销', '优惠', '秒杀', '特卖'],
      '优惠': ['促销', '折扣', '大促', '满减'],
      '招聘': ['求职', '岗位', '招聘启事', '招人', '纳贤'],
      '发布会': ['峰会', '大会', '新品', '活动', '科技'],
      '峰会': ['发布会', '大会', '科技', '论坛'],
      '科技': ['峰会', 'AI', '人工智能', '互联网', '创新'],
      'AI': ['人工智能', '科技', '智能'],
      '人工智能': ['AI', '科技', '智能'],
      '教育': ['招生', '课程', '培训', '学校', '学习', '开学'],
      '招生': ['教育', '课程', '培训', '学校'],
      '培训': ['教育', '课程', '招生', '学习'],
      '金融': ['理财', '投资', '财富', '基金', '银行', '保险'],
      '理财': ['金融', '投资', '财富', '基金'],
      '投资': ['金融', '理财', '财富', '基金'],
      '健康': ['运动', '健身', '养生', '瑜伽', '活力'],
      '运动': ['健康', '健身', '瑜伽', '活力'],
      '健身': ['健康', '运动', '瑜伽'],
      '餐饮': ['美食', '餐厅', '招牌', '外卖', '探店'],
      '美食': ['餐饮', '餐厅', '招牌', '探店'],
      '餐厅': ['餐饮', '美食', '外卖'],
      '公益': ['慈善', '捐赠', '爱心', '志愿', '环保'],
      '慈善': ['公益', '捐赠', '爱心', '志愿'],
      '捐赠': ['公益', '慈善', '爱心'],
      '房产': ['楼盘', '购房', '置业', '家居', '住宅', '开盘'],
      '楼盘': ['房产', '购房', '置业', '开盘'],
      '购房': ['房产', '置业', '楼盘'],
      '汽车': ['新车', '试驾', '驾驶', 'SUV', '新能源', '上市'],
      '新车': ['汽车', '上市', '试驾'],
      '试驾': ['汽车', '新车', '上市'],
      '母婴': ['宝宝', '育儿', '奶粉', '亲子', '护理'],
      '育儿': ['母婴', '宝宝', '亲子'],
      '宝宝': ['母婴', '育儿', '亲子'],
    }

    // 扩展查询 token：把关键词的同义词也纳入打分
    const expandedTokens = new Set()
    for (const token of tokens) {
      expandedTokens.add(token)
      const syn = SYNONYMS[token]
      if (syn) for (const s of syn) expandedTokens.add(s)
    }

    const scored = all.map((t) => {
      const haystack = [t.name, t.description, t.category, t.purpose, t.style, t.tags, t.design_notes]
        .filter(Boolean).join(' ')
      let score = 0
      for (const token of expandedTokens) {
        if (haystack.includes(token)) score += token.length >= 3 ? 3 : 2
        if ((t.name || '').includes(token)) score += 2
        if ((t.tags || '').includes(token)) score += 1
      }
      if (!raw) score = 0
      return { t, score }
    })

    const matched = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((s) => s.t)
    // Never pad search results with unrelated templates. Random recommendations made
    // the UI label unrelated designs as matches (e.g. tea searches showing finance).
    const picked = matched.slice(0, limit)
    res.json({
      templates: picked.map(serialize),
      matched: picked.length,
      query: raw,
      fallback: false,
    })
  })
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const t = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id)
    if (!t) return res.status(404).json({ error: 'NOT_FOUND', message: '模板不存在' })
    res.json({
      template: {
        ...serialize(t),
        layers: JSON.parse(t.layers || '[]'),
        background: JSON.parse(t.background || '{}'),
      },
    })
  })
)

export default router
