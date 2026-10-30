/**
 * 中文关键词 → 英文生图 prompt 转换器。
 * Pollinations 匿名层对中文理解差，必须转成英文才能生成贴题的图。
 *
 * 策略：
 * 1. 若输入本身含英文/拉丁字符，直接透传；
 * 2. 否则走「中文主题词 → 英文场景描述」映射，覆盖常见海报品类；
 * 3. 未命中映射时，用「通用摄影背景」模板 + 原词音译兜底（避免完全跑题）。
 */

// 中文关键词 → 英文视觉描述（用于海报底图，强调留白、氛围、可叠字）
const TOPIC_MAP = [
  // 节日 / 情感
  { keys: ['情人节', '七夕', '520', '告白', '爱情', '浪漫', '恋爱'], en: 'a romantic valentine scene with red roses and soft bokeh hearts, warm pink and red tones, dreamy atmosphere, shallow depth of field, elegant space for text' },
  { keys: ['玫瑰', '鲜花', '花束'], en: 'a bouquet of fresh roses in soft natural light, delicate petals, elegant floral background, space for text' },
  { keys: ['婚礼', '婚庆', '结婚'], en: 'an elegant wedding scene with soft flowers and warm golden light, romantic atmosphere, refined composition, space for text' },
  { keys: ['圣诞', '圣诞节'], en: 'a cozy christmas scene with warm lights and festive decorations, red and green tones, magical bokeh, space for text' },
  { keys: ['中秋', '月亮', '团圆'], en: 'a serene mid-autumn night with a bright full moon and warm lanterns, elegant chinese festival mood, space for text' },
  { keys: ['春节', '新年', '过年'], en: 'a festive chinese new year scene with red lanterns and gold accents, joyful celebration, space for text' },
  { keys: ['母亲节', '感恩'], en: 'warm soft flowers and gentle morning light, tender and caring mood, delicate background, space for text' },

  // 自然 / 环保
  { keys: ['环保', '环境', '绿色', '生态', '低碳'], en: 'lush green forest with sunlight filtering through leaves, fresh eco atmosphere, vibrant green tones, space for text' },
  { keys: ['森林', '树林'], en: 'a misty green forest with tall trees and soft light, serene nature, space for text' },
  { keys: ['自然', '风景', '山水'], en: 'a breathtaking natural landscape with mountains and water, tranquil atmosphere, space for text' },
  { keys: ['海洋', '大海', '海边'], en: 'a calm ocean view with gentle waves and soft sky, relaxing coastal mood, space for text' },
  { keys: ['春天', '春季'], en: 'spring blossoms and fresh greenery, soft pastel tones, vibrant and hopeful mood, space for text' },

  // 美食 / 餐饮
  { keys: ['咖啡', '咖啡馆'], en: 'a warm coffee shop scene with a cup of coffee on a wooden table, cozy ambient light, steam rising, space for text' },
  { keys: ['美食', '餐饮', '餐厅', '料理', '食物'], en: 'an appetizing gourmet dish beautifully plated, warm appetizing tones, professional food photography, space for text' },
  { keys: ['甜品', '蛋糕', '甜点'], en: 'an elegant dessert with soft pastel tones, delicate and sweet, professional food styling, space for text' },
  { keys: ['茶', '茶叶', '茶饮'], en: 'a serene tea ceremony scene with tea leaves and a cup of tea, zen atmosphere, soft light, space for text' },

  // 科技 / 商务
  { keys: ['科技', 'AI', '人工智能', '智能', '数码'], en: 'futuristic technology background with glowing circuit lines and digital particles, blue purple gradient, high-tech feel, space for text' },
  { keys: ['商务', '办公', '职场', '企业', '会议'], en: 'a modern professional office environment, clean and elegant, blue grey tones, business atmosphere, space for text' },
  { keys: ['招聘', '求职', '面试', '工作', '岗位'], en: 'a professional business scene with handshake and modern office, trustworthy and dynamic, space for text' },
  { keys: ['金融', '理财', '投资', '财富', '股票'], en: 'a sleek financial theme with golden coins and rising chart, prosperity and growth, elegant gold tones, space for text' },

  // 生活 / 消费
  { keys: ['美妆', '护肤', '化妆', '美容', '彩妆'], en: 'elegant cosmetics and skincare products with soft pink tones, luxurious beauty mood, professional product photography, space for text' },
  { keys: ['母婴', '宝宝', '婴儿', '亲子'], en: 'a gentle baby care scene with soft pastel colors, tender and warm mood, space for text' },
  { keys: ['宠物', '猫', '狗', '萌宠'], en: 'an adorable pet in a warm home setting, cute and heartwarming, soft light, space for text' },
  { keys: ['健身', '运动', '锻炼', '体育'], en: 'an energetic fitness scene with sport equipment, dynamic and vibrant, orange energetic tones, space for text' },
  { keys: ['汽车', '跑车', '轿车'], en: 'a sleek modern car in dramatic studio lighting, luxury automotive photography, space for text' },
  { keys: ['房产', '楼盘', '房屋', '住宅'], en: 'a modern residential building with elegant architecture, blue sky, real estate photography, space for text' },
  { keys: ['旅游', '旅行', '度假', '户外'], en: 'a stunning travel destination with scenic view, wanderlust mood, vibrant colors, space for text' },

  // 文化 / 教育
  { keys: ['教育', '学习', '读书', '知识', '培训'], en: 'a bright study scene with books and warm light, inspiring learning atmosphere, space for text' },
  { keys: ['音乐', '演唱会', '乐器', '演出'], en: 'a dramatic music stage with colorful lights and instruments, energetic performance mood, space for text' },
  { keys: ['艺术', '设计', '创意', '插画', '美学'], en: 'an artistic abstract composition with bold colors and creative shapes, modern design, space for text' },
]

// 通用摄影背景模板（兜底，保证不跑题到无关内容）
function genericBackdrop(term) {
  const romanized = toRomanized(term)
  return `a professional background photo representing "${romanized}", soft lighting, elegant composition, subtle atmosphere, generous empty space for text overlay, high quality`
}

// 中文转拼音（粗略，用于兜底保留原义线索）
function toRomanized(text) {
  // 简单映射常用单字，避免完全丢失语义
  const map = {
    花: 'flower', 茶: 'tea', 酒: 'wine', 书: 'book', 灯: 'light', 山: 'mountain',
    水: 'water', 海: 'sea', 天: 'sky', 星: 'star', 月: 'moon', 日: 'sun',
    爱: 'love', 心: 'heart', 梦: 'dream', 光: 'light', 影: 'shadow', 雪: 'snow',
    春: 'spring', 夏: 'summer', 秋: 'autumn', 冬: 'winter', 木: 'wood', 金: 'gold',
    红: 'red', 蓝: 'blue', 绿: 'green', 黑: 'black', 白: 'white', 紫: 'purple',
    美: 'beauty', 家: 'home', 城: 'city', 街: 'street', 店: 'shop', 园: 'garden',
  }
  const chars = [...text].filter((c) => map[c]).map((c) => map[c])
  return chars.slice(0, 4).join(' ') || text
}

/**
 * 主入口：中文关键词 → 英文生图 prompt
 */
export function keywordToImagePrompt(keyword) {
  const q = String(keyword || '').trim()
  if (!q) return ''

  // 已含英文/拉丁字符 → 直接透传（用户可能直接输英文）
  if (/[a-zA-Z]/.test(q)) {
    return `${q}, professional photography, elegant composition, space for text overlay, high quality`
  }

  for (const { keys, en } of TOPIC_MAP) {
    if (keys.some((k) => q.includes(k))) return en
  }
  return genericBackdrop(q)
}

/**
 * 生成多套不同的 prompt（通过变化视角/光影/构图，让多张底图有差异）
 */
export function buildImagePromptVariants(keyword, count = 4) {
  const base = keywordToImagePrompt(keyword)
  if (!base) return []
  const variants = [
    base,
    `${base}, wide shot with generous negative space`,
    `${base}, close-up detail with soft bokeh`,
    `${base}, cinematic lighting and atmospheric depth`,
    `${base}, minimal clean composition`,
    `${base}, warm golden hour mood`,
  ]
  return variants.slice(0, count)
}
