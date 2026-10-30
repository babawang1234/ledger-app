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

  // 工业 / 制造 / 水厂（新增，解决"水厂"等具体实体词理解）
  { keys: ['水厂', '净水', '水处理', '污水处理', '自来水', '水务'], en: 'a modern water treatment plant with circular settling tanks and clean industrial facilities, aerial view, blue and white industrial tones, professional engineering photography, space for text' },
  { keys: ['工厂', '工业', '制造', '车间', '厂房'], en: 'a modern industrial factory with clean production facilities and machinery, blue grey industrial tones, professional manufacturing photography, space for text' },
  { keys: ['电力', '发电', '能源', '电站'], en: 'a modern power plant with cooling towers and transmission lines, blue sky, industrial energy photography, space for text' },

  // 交通 / 新能源（新增，解决"充电桩""新能源汽车"等具体词）
  { keys: ['充电桩', '充电站', '新能源汽车', '电动车', '充电'], en: 'a modern electric vehicle charging station with sleek charging piles and a clean energy aesthetic, bright and futuristic, professional photography, space for text' },
  { keys: ['新能源', '清洁能源', '光伏', '太阳能'], en: 'solar panels and clean energy infrastructure under a bright blue sky, sustainable technology, space for text' },

  // 农业 / 食品原料（新增，解决"茶叶""咖啡豆"等具体词）
  { keys: ['茶叶', '茶园', '龙井', '茶山'], en: 'a lush green tea plantation with fresh tea leaves on rolling hills, morning mist, serene agricultural landscape, space for text' },
  { keys: ['大米', '粮食', '稻田', '农场'], en: 'golden rice paddy fields at harvest time, warm sunlight, agricultural landscape, space for text' },
  { keys: ['水果', '果园', '橙子', '苹果'], en: 'fresh fruits in a vibrant orchard, colorful and appetizing, professional food photography, space for text' },

  // 运动 / 户外（新增，解决"马拉松""登山"等具体词）
  { keys: ['马拉松', '跑步', '长跑', '越野跑'], en: 'a marathon runner on an open road at sunrise, dynamic and energetic, sport photography, space for text' },
  { keys: ['登山', '爬山', '徒步', '露营', '户外'], en: 'a hiker on a mountain trail with a scenic view, adventurous outdoor mood, space for text' },
  { keys: ['篮球', '足球', '运动', '球赛'], en: 'a dynamic sports scene with athletes in action, energetic and vivid, professional sports photography, space for text' },

  // 家居 / 生活（新增，解决"空气净化器""家电"等具体词）
  { keys: ['空气净化器', '净化器', '家电', '家居'], en: 'a modern air purifier in a clean bright living room, minimalist home appliance, soft natural light, space for text' },
  { keys: ['家具', '沙发', '客厅', '室内'], en: 'a stylish modern living room with elegant furniture, warm and cozy interior design, space for text' },

  // 医疗 / 保健（新增，解决"中医""养生"等具体词）
  { keys: ['中医', '养生', '针灸', '保健'], en: 'traditional chinese medicine herbs and natural wellness elements, warm earthy tones, serene healing mood, space for text' },
  { keys: ['医院', '医生', '护士', '医疗'], en: 'a clean modern medical environment with caring healthcare professionals, bright and trustworthy, space for text' },
]

// 通用摄影背景模板（兜底，保证不跑题到无关内容）
function genericBackdrop(term) {
  const romanized = toRomanized(term)
  return `a professional background photo representing "${romanized}", soft lighting, elegant composition, subtle atmosphere, generous empty space for text overlay, high quality`
}

// 中文转英文关键词（粗略，用于兜底保留原义线索）
function toRomanized(text) {
  // 常用单字/双字 → 英文映射，覆盖常见海报主体
  const map = {
    花: 'flower', 茶: 'tea', 酒: 'wine', 书: 'book', 灯: 'light', 山: 'mountain',
    水: 'water', 海: 'sea', 天: 'sky', 星: 'star', 月: 'moon', 日: 'sun',
    爱: 'love', 心: 'heart', 梦: 'dream', 光: 'light', 影: 'shadow', 雪: 'snow',
    春: 'spring', 夏: 'summer', 秋: 'autumn', 冬: 'winter', 木: 'wood', 金: 'gold',
    红: 'red', 蓝: 'blue', 绿: 'green', 黑: 'black', 白: 'white', 紫: 'purple',
    美: 'beauty', 家: 'home', 城: 'city', 街: 'street', 店: 'shop', 园: 'garden',
    车: 'car', 电: 'electricity', 充: 'charge', 桩: 'pile', 新: 'new', 能: 'energy',
    咖: 'coffee', 啡: 'coffee', 机: 'machine', 器: 'device', 器皿: 'vessel',
    龙: 'dragon', 井: 'well', 叶: 'leaf', 跑: 'run', 马: 'horse', 拉: 'pull', 松: 'pine',
    医: 'medical', 药: 'medicine', 教: 'education', 育: 'nurture', 学: 'study', 习: 'learn',
  }
  const chars = [...text].filter((c) => map[c]).map((c) => map[c])
  return chars.slice(0, 5).join(' ') || text
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
