/**
 * 需求解析技能：把用户的自然语言描述解析为结构化创作 brief。
 * 未接入真实语言模型时使用确定性关键词解析（mock，结果会明确标注演示模式）。
 * 接入真实模型后，可在 routes/inspire.js 中先用 parseBrief 兜底，再用 LLM 精修。
 */

const PURPOSE_RULES = [
  { key: '节日祝福', words: ['教师节', '老师节', '教师节海报', '教师节祝福', '谢师', '师恩', '母亲节', '父亲节', '儿童节', '护士节', '春节', '中秋节', '端午节', '国庆节', '节日祝福'] },
  { key: '电商促销', words: ['促销', '打折', '折扣', '大促', '秒杀', '优惠券', '满减', '双十一', '双11', '电商', '上新', '清仓', '直播带货', '五折', '特卖'] },
  { key: '活动宣传', words: ['活动', '发布会', '演出', '音乐节', '演唱会', '市集', '展览', '峰会', '论坛', '沙龙', '开幕', '报名', '讲座', '年会', '婚礼', '开业'] },
  { key: '社媒运营', words: ['小红书', '公众号', '朋友圈', '微博', '抖音', '封面', '配图', '社媒', '推文', '打卡', '种草', '头像'] },
  { key: '产品推广', words: ['新品', '产品', '上市', '发布', '功能', '卖点', 'app', '软件', '硬件', '开售', '预售', '官网'] },
  { key: '品牌宣传', words: ['品牌', '周年', '理念', '价值', '形象', '节日', '祝福', '贺卡', '企业文化'] },
  { key: '招聘启事', words: ['招聘', '招人', '岗位', '简历', 'hr', '雇主', '加入我们', '急聘'] },
]

const STYLE_RULES = [
  { key: 'violet', name: '紫蓝科技', words: ['科技', '未来', '互联网', '数字', '智能', 'ai', '赛博', '极客', '发布会'] },
  { key: 'sunset', name: '暖橙热情', words: ['美食', '餐饮', '咖啡', '火锅', '烧烤', '暖', '温暖', '热情', '促销', '大促', '折扣'] },
  { key: 'ocean', name: '深海冷调', words: ['商务', '金融', '医疗', '冷静', '专业', '科技感', '水', '海洋'] },
  { key: 'mono', name: '极简黑白', words: ['简约', '极简', '黑白', '性冷淡', '高级', '设计感', '杂志', '招聘'] },
  { key: 'forest', name: '青绿清新', words: ['自然', '环保', '植物', '健康', '清新', '户外', '露营', '有机', '茶'] },
  { key: 'rose', name: '玫瑰浪漫', words: ['浪漫', '婚礼', '情人节', '女性', '美妆', '花', '粉色', '甜品', '礼物'] },
]

const RATIO_RULES = [
  { key: '9:16', words: ['手机', '全屏', ' stories ', '短视频封面', '竖屏', '朋友圈竖图'] },
  { key: '3:4', words: ['海报', '竖版', '小红书', '朋友圈', '传单', '易拉宝'] },
  { key: '1:1', words: ['方图', '头像', 'instagram', 'ins', '正方形', '微博配图'] },
  { key: '16:9', words: ['横版', 'banner', '横幅', '网页头图', '公众号封面', 'ppt'] },
]

function extractMatches(text, rules) {
  const lower = text.toLowerCase()
  const hits = []
  for (const rule of rules) {
    const matched = rule.words.filter((w) => lower.includes(w))
    if (matched.length) hits.push({ key: rule.key, name: rule.name, words: matched })
  }
  return hits
}

// Chinese poster-search vocabulary: terms map to visual concepts rather than relying
// on whitespace tokenization (Chinese briefs normally contain no spaces).
const VISUAL_CONCEPTS = [
  { key: 'teachers-day', terms: ['教师节海报', '教师节祝福', '教师节', '老师节', '师恩', '谢师'], query: 'teacher classroom students portrait appreciation editorial photography' },
  { key: 'teacher', terms: ['老师', '教师', '园丁', '课堂', '讲台'], query: 'teacher classroom students portrait education editorial photography' },
  { key: 'coffee', terms: ['咖啡店', '咖啡馆', '咖啡', '拿铁', '美式', '饮品', '奶茶', '茶饮'], query: 'coffee shop latte editorial photography' },
  { key: 'bakery', terms: ['烘焙', '面包店', '面包', '可颂', '蛋糕', '甜品', '甜点', '糕点'], query: 'artisan bakery pastries editorial photography' },
  { key: 'skincare', terms: ['护肤', '精华', '化妆品', '美妆', '彩妆', '香水', '护肤品'], query: 'skincare product still life photography' },
  { key: 'flower', terms: ['花店', '花束', '鲜花', '玫瑰', '康乃馨', '花艺', '绿植'], query: 'floral bouquet editorial photography' },
  { key: 'architecture', terms: ['建筑', '空间设计', '室内设计', '展厅', '地产', '建筑设计'], query: 'modern architecture editorial photography' },
  { key: 'portrait', terms: ['人物', '肖像', '招聘', '招人', '岗位', '设计师', '团队'], query: 'creative team portrait editorial photography' },
  { key: 'concert', terms: ['演出', '演唱会', '音乐节', '乐队', '舞台', 'livehouse'], query: 'live music concert stage photography' },
  { key: 'winter', terms: ['冬天', '冬季', '立冬', '雪山', '滑雪', '圣诞', '节气'], query: 'winter landscape editorial photography' },
  { key: 'market', terms: ['市集', '集市', '摊位', '快闪', '周末活动'], query: 'weekend market lifestyle photography' },
  { key: 'product', terms: ['新品', '上新', '产品', '商品', '单品', '开售', '新品发布'], query: 'premium product still life photography' },
  { key: 'celebration', terms: ['周年', '庆典', '庆祝', '开业', '年会', '纪念日'], query: 'celebration event editorial photography' },
  { key: 'technology', terms: ['科技', '软件', '应用', '数码', '智能', 'ai', '互联网'], query: 'technology product launch editorial photography' },
  { key: 'travel', terms: ['旅行', '旅游', '酒店', '民宿', '露营', '度假', '户外'], query: 'travel destination editorial photography' },
  { key: 'education', terms: ['课程', '培训', '招生', '教育', '学校', '讲座', '工作坊'], query: 'education workshop editorial photography' },
  { key: 'fitness', terms: ['健身', '运动', '瑜伽', '跑步', '训练', '球赛'], query: 'fitness sport editorial photography' },
]

const STOP_WORDS = new Set(['我想', '想做', '帮我', '做一张', '做一个', '帮我做', '请做', '海报', '图片', '画面', '生成', '设计', '制作', '帮忙', '需要', '一个', '一张', '的', '给', '做', '想要', '一些', '好看', '漂亮', '高级', '风格', '用于', '用来', '帮忙做'])

function visualConcepts(text) {
  const lower = String(text || '').toLowerCase()
  return VISUAL_CONCEPTS
    .map((concept) => ({ ...concept, matched: concept.terms.filter((term) => lower.includes(term.toLowerCase())) }))
    .filter((concept) => concept.matched.length)
    .sort((a, b) => Math.max(...b.matched.map((term) => term.length)) - Math.max(...a.matched.map((term) => term.length)))
}

function extractSubject(text, concepts) {
  const quoted = String(text).match(/[「“"']([^」”"']{2,24})[」”"']/)?.[1]
  if (quoted) return quoted.trim()
  if (concepts.some((concept) => concept.key === 'teachers-day')) return '教师节'
  const subject = String(text)
    .replace(/^(?:我想|我想要|帮我|请帮我|请|想要|想做)?(?:做|制作|设计|生成)?(?:一张|一个|一款|一组|一幅|张|个)?/u, '')
    .split(/[，,。.!！?？；;\n]/u)[0]
    .replace(/(?:海报|宣传图|主视觉|封面|配图|图片).*/u, '')
    .replace(/^(?:给|为)/u, '')
    .replace(/(?:发朋友圈|发小红书|发公众号|用于朋友圈|用于小红书|用在朋友圈|用在小红书).*/u, '')
    .replace(/(?:的)?(?:促销|宣传|推广|推荐|上新|发布|预告|活动|海报).*$/u, '')
    .replace(/[的之]+$/u, '')
    .replace(/\s+/g, '')
    .trim()
  if (subject && subject.length >= 2 && subject.length <= 18) {
    return subject.replace(/(?:请|帮我|做一个|做一张|想做|想要|设计|制作|生成|用于|用来)/gu, '')
  }
  return concepts.flatMap((concept) => concept.matched).slice(0, 3).join('')
}

export function draftCopy(text, purpose, concepts = []) {
  const explicit = String(text).match(/(?:标题|主标题|主文案|文案)\s*[：:是为]?\s*[「“"']?([^」”"'，,。.!！?？\n]{2,20})/u)?.[1]?.trim()
  const subject = extractSubject(text, concepts)
  const conceptKeys = new Set(concepts.map((concept) => concept.key))
  const coffeeTerms = concepts.find((concept) => concept.key === 'coffee')?.matched || []
  const coffee = coffeeTerms.find((term) => ['拿铁', '美式', '奶茶', '茶饮', '饮品'].includes(term)) || coffeeTerms.find((term) => !['咖啡店', '咖啡馆', '咖啡'].includes(term)) || '咖啡'
  const bakery = concepts.find((concept) => concept.key === 'bakery')?.matched[0]
  const flower = concepts.find((concept) => concept.key === 'flower')?.matched[0]
  const product = concepts.find((concept) => concept.key === 'skincare')?.matched[0]
  const teachersDay = conceptKeys.has('teachers-day')
  let headline = explicit || ''
  let subheadline = ''
  let body = ''
  let cta = '了解详情'

  if (!headline) {
    if (teachersDay) { headline = '谢谢您，老师'; subheadline = '每一份认真，都点亮成长'; body = '把感谢说给一直用心的您'; cta = '致敬每一位老师' }
    else if (conceptKeys.has('coffee')) { headline = coffee === '拿铁' ? '新品拿铁上新' : coffee === '美式' ? '新鲜美式，今日上新' : coffee === '奶茶' ? '一杯奶茶的好心情' : '一杯新灵感'; subheadline = `${coffee}新品 · 到店尝鲜`; body = '为日常留一点醇香时光'; cta = '立即品尝' }
    else if (bakery) { headline = bakery.includes('可颂') ? '可颂新鲜出炉' : '新鲜出炉'; subheadline = `${bakery} · 今日限定`; body = '现烤香气，刚好趁热分享'; cta = '到店选购' }
    else if (flower) { headline = '把心意送给你'; subheadline = `${flower}甄选 · 为重要时刻`; body = '让一束鲜花替你表达'; cta = '挑选花礼' }
    else if (product) { headline = '焕新上市'; subheadline = `${product}新品 · 温柔焕亮`; body = '为日常护理添一份新选择'; cta = '立即了解' }
    else if (conceptKeys.has('concert')) { headline = '现场见'; subheadline = '把今晚留给音乐'; body = '灯光亮起，一起沉浸现场'; cta = '预约入场' }
    else if (conceptKeys.has('market')) { headline = '周末市集见'; subheadline = '好物、灵感与生活相遇'; body = '来现场逛逛，发现新的喜欢'; cta = '查看活动' }
    else if (purpose === '招聘启事') { headline = '寻找新伙伴'; subheadline = '和我们一起，把想法变成作品'; body = '期待有创意、有行动力的你加入'; cta = '投递简历' }
    else if (purpose === '电商促销') { headline = subject ? `${subject.slice(0, 8)}限时选购` : '限时优惠'; subheadline = '精选好物 · 即刻选购'; body = '好物已就位，去看看本次推荐'; cta = '立即选购' }
    else if (purpose === '活动宣传') { headline = subject ? `${subject.slice(0, 8)}见` : '期待现场相见'; subheadline = '一场值得期待的相聚'; body = '时间与地点可在编辑时补充'; cta = '查看活动' }
    else if (purpose === '品牌宣传') { headline = subject ? `${subject.slice(0, 8)}新章` : '让品牌被看见'; subheadline = '以新的视角，表达品牌主张'; body = '让每一次相遇都留下清晰印象'; cta = '了解品牌' }
    else { headline = subject ? subject.slice(0, 10) : '灵感即刻发生'; subheadline = '把想法变成值得分享的视觉'; body = '清晰表达重点，让设计更有记忆点'; cta = '立即了解' }
  } else {
    subheadline = purpose === '电商促销' ? '精选好物 · 活动进行中' : purpose === '活动宣传' ? '期待与你现场相见' : '为重要时刻，做一张值得记住的海报'
    cta = purpose === '电商促销' ? '立即选购' : purpose === '招聘启事' ? '投递简历' : '了解详情'
  }

  return {
    headline: headline.slice(0, 18),
    subheadline: subheadline.slice(0, 28),
    body: body.slice(0, 48),
    datetime: '',
    location: '',
    brand: '',
    cta,
  }
}

export function parseBrief(description = '') {
  const text = String(description).trim()
  const purposeHits = extractMatches(text, PURPOSE_RULES)
  const styleHits = extractMatches(text, STYLE_RULES)
  const ratioHits = extractMatches(text, RATIO_RULES)
  const concepts = visualConcepts(text)

  const purpose = purposeHits[0]?.key || (concepts.some((c) => ['coffee', 'bakery', 'skincare', 'flower', 'product'].includes(c.key)) ? '产品推广' : '活动宣传')
  const styleKey = styleHits[0]?.key || null
  const ratioHint = ratioHits[0]?.key || null

  const subject = extractSubject(text, concepts)
  const keywords = [...new Set([...concepts.flatMap((concept) => concept.matched), ...purposeHits.flatMap((hit) => hit.words), ...styleHits.flatMap((hit) => hit.words), ...(subject ? [subject] : [])])]
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word))
    .slice(0, 10)

  const understanding = []
  understanding.push(`这段描述提到「${purposeHits[0]?.words[0] || purpose}」，我把海报用途判断为「${purpose}」。`)
  if (styleHits[0]) understanding.push(`「${styleHits[0].words[0]}」指向${styleHits[0].name}的视觉方向，配色与装饰会向这个气质靠拢。`)
  else understanding.push('描述中没有明确的风格词，我会结合用途选择稳妥的配色，你可以在下一步调整。')
  if (ratioHits[0]) understanding.push(`「${ratioHits[0].words[0]}」通常对应${ratioHits[0].key}画布，已为你预设（可修改）。`)
  else understanding.push('未指定尺寸，默认使用 3:4 竖版海报画布。')
  if (concepts[0]?.key === 'teachers-day') understanding.push('已识别为教师节致敬主题，只推荐教师与课堂相关的实景摄影模板。')
  else if (concepts.length) understanding.push(`主视觉主题识别为「${concepts[0].matched[0]}」，我会优先匹配对应摄影素材与版式。`)
  understanding.push('我会先替你补好标题、说明和行动文案；你可以直接在预览前逐项修改。')

  return {
    purpose,
    styleKey,
    styleName: styleHits[0]?.name || null,
    ratioHint,
    keywords,
    concepts: concepts.map(({ key, matched, query }) => ({ key, matched, query })),
    subject,
    purposeCandidates: purposeHits.slice(0, 3).map((h) => h.key),
    understanding,
    mock: true,
  }
}

/** 用解析结果给模板打分排序 */
export function scoreTemplates(templates, brief) {
  const words = [...(brief.keywords || []), ...(brief.purpose ? [brief.purpose] : [])].map((w) => String(w).toLowerCase())
  const concepts = brief.concepts || []
  return templates
    .map((t) => {
      const tagText = (t.tags || []).join(' ').toLowerCase()
      const titleText = [t.name, t.sampleContent?.headline, t.sampleContent?.subheadline].filter(Boolean).join(' ').toLowerCase()
      const haystack = [titleText, t.category, t.purpose, t.description, tagText].join(' ').toLowerCase()
      let score = 0
      const reasons = []
      for (const concept of concepts) {
        const matchedTerm = concept.matched?.find((term) => haystack.includes(term.toLowerCase()))
        const topicTag = tagText.includes(concept.key)
        if (matchedTerm || topicTag) {
          const isPrimarySubject = concept.key === concepts[0]?.key && concept.key !== 'product'
          // Concrete subject (coffee, flowers, architecture…) must outrank broad intent
          // words such as “new product” or “promotion” in the template picker.
          score += isPrimarySubject
            ? matchedTerm && tagText.includes(matchedTerm.toLowerCase()) ? 24 : 18
            : matchedTerm && tagText.includes(matchedTerm.toLowerCase()) ? 9 : matchedTerm ? 6 : 5
          reasons.push(matchedTerm || concept.key)
        }
      }
      for (const w of words) {
        if (w && w.length > 1 && haystack.includes(w)) {
          score += w === String(brief.purpose).toLowerCase() ? 2 : 4
          reasons.push(w)
        }
      }
      if (t.purpose === brief.purpose) score += 1.5
      return { template: t, score, matched: [...new Set(reasons)].slice(0, 5) }
    })
    .sort((a, b) => b.score - a.score || (b.template.featured || 0) - (a.template.featured || 0))
}
