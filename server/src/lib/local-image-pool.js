// 本地图库池：预置一批 Unsplash / Pexels CDN 公开图片（无需 API Key、可商用、无需署名）。
// 用于在未配置 Pexels/Unsplash Key、且 Openverse 等外部图库网络不可达时，作为图库检索的兜底数据源。
// 图片来源：
//   - images.unsplash.com 公开 CDN 直链（Unsplash License）
//   - images.pexels.com 公开 CDN 直链（Pexels License，可免费商用、无需署名）
// 每张图带 keywords（用于关键词匹配）、category（分类）和 source（图源）。

const P = (id) => `https://images.unsplash.com/photo-${id}?w=800&q=80&fm=jpg&fit=crop`
const PT = (id) => `https://images.unsplash.com/photo-${id}?w=400&q=75&fm=jpg&fit=crop`
// Pexels CDN：images.pexels.com/photos/{id}/{slug}.jpeg —— slug 可省，用统一形式
const PX = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`
const PXT = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400`

// 每条：{ id, category, label, keywords: [...], w, h, source }
const POOL = [
  // 咖啡 / 餐饮
  { id: '1495474472287-4d71bcdd2085', category: '咖啡', label: '咖啡', keywords: ['咖啡', 'coffee', '饮品', '咖啡馆', '饮料'], w: 1600, h: 1067 },
  { id: '1509042239860-f550ce710b93', category: '咖啡', label: '咖啡', keywords: ['咖啡', 'coffee', '饮品', '饮料'], w: 1600, h: 1067 },
  { id: '1447933601403-0c6688de566e', category: '咖啡', label: '咖啡', keywords: ['咖啡', 'coffee', '饮品'], w: 1600, h: 1067 },
  { id: '1504674900247-0877df9cc836', category: '美食', label: '美食', keywords: ['美食', '食物', '餐饮', '料理', '吃'], w: 1600, h: 1067 },
  { id: '1512621776951-a57141f2eefd', category: '美食', label: '健康餐', keywords: ['美食', '健康', '沙拉', '轻食', '蔬菜'], w: 1600, h: 1067 },
  { id: '1546069901-ba9599a7e63c', category: '美食', label: '美食', keywords: ['美食', '食物', '餐饮', '料理'], w: 1600, h: 1067 },

  // 自然 / 环保
  { id: '1441974231531-c6227db76b6e', category: '环保', label: '森林', keywords: ['森林', '环保', '自然', '绿色', '生态', '树木', '环境'], w: 1600, h: 1067 },
  { id: '1500530855697-b586d89ba3ee', category: '环保', label: '自然', keywords: ['自然', '环保', '风景', '绿色', '生态', '环境'], w: 1600, h: 1067 },
  { id: '1470071459604-3b5ec3a7fe05', category: '环保', label: '自然', keywords: ['自然', '环保', '风景', '山', '环境'], w: 1600, h: 1067 },
  { id: '1472214103451-9374bd1c798e', category: '环保', label: '自然', keywords: ['自然', '环保', '风景', '环境', '生态'], w: 1600, h: 1067 },
  { id: '1440342359743-84fcb8c21f21', category: '环保', label: '森林', keywords: ['森林', '环保', '树木', '绿色', '自然', '环境'], w: 1600, h: 1067 },
  { id: '1433086966358-54859d0ed716', category: '环保', label: '自然瀑布', keywords: ['自然', '瀑布', '环保', '水', '风景', '环境'], w: 1600, h: 1067 },

  // 城市 / 建筑
  { id: '1449824913935-59a10b8d2000', category: '城市', label: '城市', keywords: ['城市', '都市', '建筑', '高楼', '夜景'], w: 1600, h: 1067 },
  { id: '1477959858617-67f85cf4f1df', category: '城市', label: '城市', keywords: ['城市', '都市', '建筑', '夜景'], w: 1600, h: 1067 },
  { id: '1480714378408-67cf0d13bc1b', category: '城市', label: '城市建筑', keywords: ['城市', '建筑', '都市', '楼'], w: 1600, h: 1067 },
  { id: '1487958449943-2429e8be8625', category: '建筑', label: '建筑', keywords: ['建筑', '设计', '房屋', '楼', '空间'], w: 1600, h: 1067 },

  // 科技
  { id: '1518770660439-4636190af475', category: '科技', label: '科技', keywords: ['科技', '芯片', '电子', '电路', '硬件', 'AI', '人工智能'], w: 1600, h: 1067 },
  { id: '1485827404703-89b55fcc595e', category: '科技', label: '科技AI', keywords: ['科技', 'AI', '人工智能', '机器人', '智能'], w: 1600, h: 1067 },
  { id: '1526374965328-7f61d4dc18c5', category: '科技', label: '科技代码', keywords: ['科技', '代码', '编程', '程序', '互联网', '软件'], w: 1600, h: 1067 },
  { id: '1519389950473-47ba0277781c', category: '科技', label: '科技团队', keywords: ['科技', '团队', '办公', '创业', '互联网'], w: 1600, h: 1067 },

  // 汽车
  { id: '1494976388531-d1058494cdd8', category: '汽车', label: '汽车', keywords: ['汽车', '车', '跑车', '轿车', '驾驶'], w: 1600, h: 1067 },
  { id: '1503376780353-7e6692767b70', category: '汽车', label: '跑车', keywords: ['汽车', '跑车', '车', '豪车', '速度'], w: 1600, h: 1067 },
  { id: '1552519507-da3b142c6e3d', category: '汽车', label: '汽车', keywords: ['汽车', '车', '轿车'], w: 1600, h: 1067 },

  // 旅游
  { id: '1507525428034-b723cf961d3e', category: '旅游', label: '旅行海滩', keywords: ['旅游', '旅行', '海滩', '度假', '海', '风景'], w: 1600, h: 1067 },
  { id: '1469854523086-cc02fe5d8800', category: '旅游', label: '旅行', keywords: ['旅游', '旅行', '风景', '公路', '度假'], w: 1600, h: 1067 },
  { id: '1488085061387-422e29b40080', category: '旅游', label: '旅行', keywords: ['旅游', '旅行', '风景', '度假', '户外'], w: 1600, h: 1067 },
  { id: '1506929562872-bb421503ef21', category: '旅游', label: '旅行海滩', keywords: ['旅游', '旅行', '海滩', '度假', '海'], w: 1600, h: 1067 },

  // 教育
  { id: '1503676260728-1c00da094a0b', category: '教育', label: '教育', keywords: ['教育', '学习', '书', '阅读', '知识', '培训'], w: 1600, h: 1067 },
  { id: '1427504494785-3a9ca7044f45', category: '教育', label: '教育', keywords: ['教育', '学习', '课堂', '学校', '培训'], w: 1600, h: 1067 },

  // 健身 / 运动
  { id: '1517836357463-d25dfeac3438', category: '运动', label: '健身', keywords: ['健身', '运动', '锻炼', '健身房', '体育'], w: 1600, h: 1067 },
  { id: '1571019613454-1cb2f99b2d8b', category: '运动', label: '运动', keywords: ['运动', '健身', '跑步', '体育', '锻炼'], w: 1600, h: 1067 },
  { id: '1461896836934-ffe607ba8211', category: '运动', label: '运动', keywords: ['运动', '体育', '比赛', '竞技'], w: 1600, h: 1067 },

  // 商务 / 办公
  { id: '1556761175-5973dc0f32e7', category: '商务', label: '商务办公', keywords: ['商务', '办公', '会议', '职场', '公司', '企业'], w: 1600, h: 1067 },
  { id: '1454165804606-c3d57bc86b40', category: '商务', label: '商务', keywords: ['商务', '办公', '职场', '企业', '合作'], w: 1600, h: 1067 },
  { id: '1497366216548-37526070297c', category: '商务', label: '办公', keywords: ['办公', '商务', '职场', '工作', '企业'], w: 1600, h: 1067 },
  { id: '1521737711867-e3b97375f902', category: '商务', label: '团队', keywords: ['团队', '商务', '办公', '合作', '创业'], w: 1600, h: 1067 },

  // 医疗 / 健康
  { id: '1505751172876-fa1923c5c528', category: '健康', label: '医疗', keywords: ['医疗', '健康', '医生', '医院', '保健'], w: 1600, h: 1067 },
  { id: '1532938911079-1b06ac7ceec7', category: '健康', label: '健康', keywords: ['健康', '医疗', '养生', '保健', '运动'], w: 1600, h: 1067 },
  { id: '1576091160399-112ba8d25d1d', category: '健康', label: '医疗', keywords: ['医疗', '健康', '医生', '医院'], w: 1600, h: 1067 },

  // 金融
  { id: '1611974789855-9c2a0a7236a3', category: '金融', label: '金融', keywords: ['金融', '理财', '投资', '财富', '股票', '银行'], w: 1600, h: 1067 },
  { id: '1554224155-6726b3ff858f', category: '金融', label: '金融', keywords: ['金融', '理财', '投资', '财务', '会计', '银行'], w: 1600, h: 1067 },

  // 母婴
  { id: '1519689680058-324335c77eba', category: '母婴', label: '母婴', keywords: ['母婴', '宝宝', '婴儿', '亲子', '育儿'], w: 1600, h: 1067 },
  { id: '1544126592-807ade215a0b', category: '母婴', label: '母婴', keywords: ['母婴', '宝宝', '婴儿', '亲子'], w: 1600, h: 1067 },

  // 宠物
  { id: '1548199973-03cce0bbc87b', category: '宠物', label: '宠物狗', keywords: ['宠物', '狗', '动物', '萌宠'], w: 1600, h: 1067 },
  { id: '1514888286974-6c03e2ca1dba', category: '宠物', label: '宠物猫', keywords: ['宠物', '猫', '动物', '萌宠'], w: 1600, h: 1067 },
  { id: '1425082661705-1834bfd09dca', category: '宠物', label: '宠物', keywords: ['宠物', '动物', '萌宠'], w: 1600, h: 1067 },

  // 美妆
  { id: '1522335789203-aabd1fc54bc9', category: '美妆', label: '美妆', keywords: ['美妆', '化妆品', '护肤', '口红', '美容'], w: 1600, h: 1067 },
  { id: '1596462502278-27bfdc403348', category: '美妆', label: '美妆', keywords: ['美妆', '化妆品', '护肤', '美容'], w: 1600, h: 1067 },
  { id: '1512496015851-a90fb38ba796', category: '美妆', label: '美妆', keywords: ['美妆', '化妆品', '护肤', '美容', '彩妆'], w: 1600, h: 1067 },

  // 音乐
  { id: '1470229722913-7c0e2dbbafd3', category: '音乐', label: '音乐', keywords: ['音乐', '演唱会', '乐器', '演出', '现场'], w: 1600, h: 1067 },
  { id: '1511379938547-c1f69419868d', category: '音乐', label: '音乐', keywords: ['音乐', '乐器', '钢琴', '演奏'], w: 1600, h: 1067 },

  // 摄影 / 风景
  { id: '1501854140801-50d01698950b', category: '风景', label: '风景', keywords: ['风景', '自然', '山水', '摄影', '风光'], w: 1600, h: 1067 },
  { id: '1519681393784-d120267933ba', category: '风景', label: '风景山', keywords: ['风景', '山', '自然', '雪山', '风光'], w: 1600, h: 1067 },
  { id: '1470770841072-f978cf4d019e', category: '风景', label: '风景', keywords: ['风景', '自然', '湖', '山水', '风光'], w: 1600, h: 1067 },

  // ==== 补充：咖啡 ====
  { id: '1501339847302-ac426a4a7cbb', category: '咖啡', label: '咖啡', keywords: ['咖啡', 'coffee', '饮品', '咖啡馆'], w: 1600, h: 1067 },
  { id: '1524350876685-274059332603', category: '咖啡', label: '咖啡', keywords: ['咖啡', 'coffee', '饮品'], w: 1600, h: 1067 },
  // ==== 补充：美食 ====
  { id: '1555939594-58d7cb561ad1', category: '美食', label: '美食', keywords: ['美食', '食物', '餐饮', '料理'], w: 1600, h: 1067 },
  { id: '1414235077428-338989a2e8c0', category: '美食', label: '美食', keywords: ['美食', '餐饮', '餐厅', '食物'], w: 1600, h: 1067 },
  { id: '1467003909585-2f8a72700288', category: '美食', label: '美食', keywords: ['美食', '食物', '料理', '餐饮'], w: 1600, h: 1067 },
  // ==== 补充：自然 ====
  { id: '1447752875215-b2761acb3c5d', category: '环保', label: '森林', keywords: ['森林', '环保', '树木', '绿色', '自然', '环境'], w: 1600, h: 1067 },
  { id: '1518495973542-4542c06a5843', category: '环保', label: '自然', keywords: ['自然', '环保', '风景', '环境', '生态'], w: 1600, h: 1067 },
  { id: '1470252649378-9c29740c9fa8', category: '环保', label: '自然', keywords: ['自然', '环保', '风景', '环境', '日落'], w: 1600, h: 1067 },
  { id: '1502082553048-f009c37129b9', category: '环保', label: '自然', keywords: ['自然', '环保', '森林', '绿色', '环境'], w: 1600, h: 1067 },
  { id: '1469474968028-56623f02e42e', category: '环保', label: '自然山', keywords: ['自然', '山', '环保', '风景', '环境'], w: 1600, h: 1067 },
  // ==== 补充：城市 ====
  { id: '1514565131-fce0801e5785', category: '城市', label: '城市', keywords: ['城市', '都市', '建筑', '夜景'], w: 1600, h: 1067 },
  { id: '1519501025264-65ba15a82390', category: '城市', label: '城市', keywords: ['城市', '都市', '建筑', '楼'], w: 1600, h: 1067 },
  // ==== 补充：科技 ====
  { id: '1531297484001-80022131f5a1', category: '科技', label: '科技', keywords: ['科技', '电子', '设备', '数码', '智能'], w: 1600, h: 1067 },
  { id: '1550751827-4bd374c3f58b', category: '科技', label: '科技', keywords: ['科技', 'AI', '人工智能', '数字', '数据'], w: 1600, h: 1067 },
  { id: '1555255707-c07966088b7b', category: '科技', label: '科技AI', keywords: ['科技', 'AI', '人工智能', '机器人'], w: 1600, h: 1067 },
  // ==== 补充：汽车 ====
  { id: '1553440569-bcc63803a83d', category: '汽车', label: '汽车', keywords: ['汽车', '车', '轿车', '驾驶'], w: 1600, h: 1067 },
  { id: '1549317661-bd32c8ce0db2', category: '汽车', label: '汽车', keywords: ['汽车', '车', '跑车'], w: 1600, h: 1067 },
  // ==== 补充：旅游 ====
  { id: '1502602898657-3e91760cbb34', category: '旅游', label: '旅行', keywords: ['旅游', '旅行', '风景', '度假'], w: 1600, h: 1067 },
  { id: '1499856871958-5b9627545d1a', category: '旅游', label: '旅行', keywords: ['旅游', '旅行', '风景', '度假', '户外'], w: 1600, h: 1067 },
  // ==== 补充：教育 ====
  { id: '1481627834876-b7833e8f5570', category: '教育', label: '教育书', keywords: ['教育', '学习', '书', '阅读', '知识'], w: 1600, h: 1067 },
  { id: '1456513080510-7bf3a84b82f8', category: '教育', label: '教育', keywords: ['教育', '学习', '课堂', '学校', '培训'], w: 1600, h: 1067 },
  // ==== 补充：运动 ====
  { id: '1534438327276-14e5300c3a48', category: '运动', label: '健身', keywords: ['健身', '运动', '锻炼', '健身房'], w: 1600, h: 1067 },
  { id: '1544367567-0f2fcb009e0b', category: '运动', label: '运动瑜伽', keywords: ['运动', '瑜伽', '健身', '健康'], w: 1600, h: 1067 },
  // ==== 补充：商务 ====
  { id: '1521791136064-7986c2920216', category: '商务', label: '商务握手', keywords: ['商务', '握手', '合作', '企业', '办公'], w: 1600, h: 1067 },
  { id: '1552664730-d307ca884978', category: '商务', label: '商务会议', keywords: ['商务', '会议', '办公', '职场', '企业'], w: 1600, h: 1067 },
  { id: '1573164713988-8665fc963095', category: '商务', label: '办公', keywords: ['办公', '商务', '职场', '工作'], w: 1600, h: 1067 },
  // ==== 补充：健康 ====
  { id: '1512290923902-8a9f81dc236c', category: '健康', label: '医疗', keywords: ['医疗', '健康', '医生', '医院'], w: 1600, h: 1067 },
  { id: '1559757148-5c350d0d3c56', category: '健康', label: '健康', keywords: ['健康', '医疗', '养生', '保健'], w: 1600, h: 1067 },
  // ==== 补充：金融 ====
  { id: '1560472354-b33ff0c44a43', category: '金融', label: '金融', keywords: ['金融', '理财', '投资', '财富', '银行'], w: 1600, h: 1067 },
  { id: '1560472355-536de3962603', category: '金融', label: '金融', keywords: ['金融', '理财', '投资', '财务'], w: 1600, h: 1067 },
  // ==== 补充：母婴 ====
  { id: '1543965170-4c01a586684e', category: '母婴', label: '母婴', keywords: ['母婴', '宝宝', '婴儿', '亲子'], w: 1600, h: 1067 },
  { id: '1555252333-9f8e92e65df9', category: '母婴', label: '母婴', keywords: ['母婴', '宝宝', '婴儿', '育儿'], w: 1600, h: 1067 },
  // ==== 补充：宠物 ====
  { id: '1517849845537-4d257902454a', category: '宠物', label: '宠物狗', keywords: ['宠物', '狗', '动物', '萌宠'], w: 1600, h: 1067 },
  { id: '1573865526739-10659fec78a5', category: '宠物', label: '宠物猫', keywords: ['宠物', '猫', '动物', '萌宠'], w: 1600, h: 1067 },
  { id: '1450778869180-41d0601e046e', category: '宠物', label: '宠物', keywords: ['宠物', '动物', '萌宠'], w: 1600, h: 1067 },
  // ==== 补充：美妆 ====
  { id: '1487412947147-5cebf100ffc2', category: '美妆', label: '美妆', keywords: ['美妆', '化妆品', '护肤', '美容'], w: 1600, h: 1067 },
  { id: '1571781926291-c477ebfd024b', category: '美妆', label: '美妆', keywords: ['美妆', '化妆品', '护肤', '彩妆'], w: 1600, h: 1067 },
  // ==== 补充：音乐 ====
  { id: '1516280440614-37939bbacd81', category: '音乐', label: '音乐', keywords: ['音乐', '乐器', '演奏', '演出'], w: 1600, h: 1067 },
  { id: '1507838153414-b4b713384a76', category: '音乐', label: '音乐', keywords: ['音乐', '演唱会', '乐器', '现场'], w: 1600, h: 1067 },
  // ==== 补充：婚礼 ====
  { id: '1519741497674-611481863552', category: '婚庆', label: '婚礼', keywords: ['婚礼', '婚庆', '结婚', '浪漫', '情人节', '爱情', '情侣'], w: 1600, h: 1067 },
  { id: '1510076857177-7470076d4098', category: '婚庆', label: '婚礼', keywords: ['婚礼', '婚庆', '结婚', '新娘', '浪漫'], w: 1600, h: 1067 },
  // ==== 补充：房产 ====
  { id: '1560518883-ce09059eeffa', category: '房产', label: '房产', keywords: ['房产', '楼盘', '房屋', '住宅', '房地产'], w: 1600, h: 1067 },
  { id: '1560448204-e02f11c3d0e2', category: '房产', label: '房产', keywords: ['房产', '房屋', '住宅', '房地产'], w: 1600, h: 1067 },
  // ==== 补充：春天/节气 ====
  { id: '1480796927426-f609979314bd', category: '节气', label: '春天', keywords: ['春天', '春', '花', '节气', '季节'], w: 1600, h: 1067 },
  { id: '1490750967868-88aa4486c946', category: '节气', label: '春天花', keywords: ['春天', '花', '春', '节气', '樱花'], w: 1600, h: 1067 },
  // ==== 补充：冬天 ====
  { id: '1483664852095-d6cc6870702d', category: '节气', label: '冬天', keywords: ['冬天', '冬', '雪', '节气', '季节'], w: 1600, h: 1067 },
  { id: '1477601263568-180e2c6d046e', category: '节气', label: '冬天', keywords: ['冬天', '雪', '冬', '季节'], w: 1600, h: 1067 },
  // ==== 补充：节日 ====
  { id: '1513151233558-d860c5398176', category: '节日', label: '节日', keywords: ['节日', '庆典', '庆祝', '活动'], w: 1600, h: 1067 },
  // ==== 补充：招聘 ====
  { id: '1521737604893-d14cc237f11d', category: '招聘', label: '招聘面试', keywords: ['招聘', '面试', '求职', '工作', '岗位'], w: 1600, h: 1067 },
  { id: '1522202176988-66273c2fd55f', category: '招聘', label: '招聘团队', keywords: ['招聘', '求职', '工作', '团队', '岗位'], w: 1600, h: 1067 },
  // ==== 补充：艺术 ====
  { id: '1547891654-e66ed7ebb968', category: '艺术', label: '艺术', keywords: ['艺术', '设计', '创意', '插画', '美学'], w: 1600, h: 1067 },
  { id: '1541961017774-22349e4a1262', category: '艺术', label: '艺术', keywords: ['艺术', '设计', '创意', '美学'], w: 1600, h: 1067 },
  // ==== 补充：情人节 / 爱情 / 浪漫 ====
  // Unsplash 图（已视觉校验内容正确）
  { id: '1518199266791-5375a83190b7', category: '情人节', label: '爱心光斑', keywords: ['情人节', '爱心', '浪漫', '爱情', '红心', '甜蜜', '表白'], w: 1600, h: 1067 },
  { id: '1518895949257-7621c3c786d7', category: '情人节', label: '粉色玫瑰', keywords: ['情人节', '玫瑰', '爱情', '浪漫', '花朵', '鲜花'], w: 1600, h: 1067 },
  { id: '1494972308805-463bc619d34e', category: '情人节', label: '红玫瑰花丛', keywords: ['情人节', '玫瑰', '爱情', '浪漫', '花朵', '红'], w: 1600, h: 1067 },
  // Pexels 图（从 Pexels 官网真实抓取，内容已确认）
  { id: '5713548', category: '情人节', label: '红心', keywords: ['情人节', '爱心', '红心', '浪漫', '爱情', '甜蜜'], w: 1600, h: 1067, source: 'pexels' },
  { id: '5713717', category: '情人节', label: '红心形状', keywords: ['情人节', '爱心', '红心', '浪漫', '爱情'], w: 1600, h: 1067, source: 'pexels' },
  { id: '6708760', category: '情人节', label: '红玫瑰', keywords: ['情人节', '玫瑰', '爱情', '浪漫', '花朵'], w: 1600, h: 1067, source: 'pexels' },
  { id: '6478820', category: '情人节', label: '红色信封爱心', keywords: ['情人节', '爱心', '信封', '表白', '浪漫', '礼物'], w: 1600, h: 1067, source: 'pexels' },
  { id: '5469264', category: '情人节', label: '心形糖果', keywords: ['情人节', '爱心', '糖果', '甜蜜', '浪漫', '礼物'], w: 1600, h: 1067, source: 'pexels' },
  { id: '30761424', category: '情人节', label: '心形气球', keywords: ['情人节', '爱心', '气球', '浪漫', '爱情', '礼物'], w: 1600, h: 1067, source: 'pexels' },
  { id: '6626091', category: '情人节', label: '情侣', keywords: ['情人节', '情侣', '爱情', '浪漫', '恋爱'], w: 1600, h: 1067, source: 'pexels' },
  { id: '867463', category: '情人节', label: '红心海报', keywords: ['情人节', '爱心', '红心', '浪漫', '海报'], w: 1600, h: 1067, source: 'pexels' },
  { id: '11133246', category: '情人节', label: '粉色心形', keywords: ['情人节', '爱心', '粉色', '浪漫', '爱情'], w: 1600, h: 1067, source: 'pexels' },
  { id: '10834231', category: '情人节', label: '心形靠垫', keywords: ['情人节', '爱心', '浪漫', '爱情', '家居'], w: 1600, h: 1067, source: 'pexels' },

  // ==== 补充：咖啡（Pexels 真实抓取）====
  { id: '27860686', category: '咖啡', label: '咖啡杯', keywords: ['咖啡', '饮品', '咖啡杯', '饮料', '咖啡店'], w: 1600, h: 1067, source: 'pexels' },
  { id: '13013307', category: '咖啡', label: '木桌咖啡', keywords: ['咖啡', '饮品', '咖啡店', '木桌'], w: 1600, h: 1067, source: 'pexels' },
  { id: '997670', category: '咖啡', label: '黑咖啡杯', keywords: ['咖啡', '饮品', '黑咖啡'], w: 1600, h: 1067, source: 'pexels' },
  { id: '26985929', category: '咖啡', label: '白杯黑咖啡', keywords: ['咖啡', '饮品', '咖啡杯'], w: 1600, h: 1067, source: 'pexels' },
  { id: '19252265', category: '咖啡', label: '咖啡特写', keywords: ['咖啡', '饮品', '咖啡店'], w: 1600, h: 1067, source: 'pexels' },
  { id: '2226091', category: '咖啡', label: '拿铁拉花', keywords: ['咖啡', '拿铁', '拉花', '饮品', '咖啡店'], w: 1600, h: 1067, source: 'pexels' },
  { id: '8700714', category: '咖啡', label: '咖啡豆', keywords: ['咖啡', '咖啡豆', '饮品'], w: 1600, h: 1067, source: 'pexels' },
  { id: '111159', category: '咖啡', label: '卡布奇诺', keywords: ['咖啡', '卡布奇诺', '饮品'], w: 1600, h: 1067, source: 'pexels' },
  { id: '765162', category: '咖啡', label: '浓缩咖啡', keywords: ['咖啡', '浓缩', '饮品'], w: 1600, h: 1067, source: 'pexels' },
  { id: '1235706', category: '咖啡', label: '倒咖啡', keywords: ['咖啡', '饮品', '咖啡杯'], w: 1600, h: 1067, source: 'pexels' },

  // ==== 补充：美食（Pexels 真实抓取）====
  { id: '7160695', category: '美食', label: '料理美食', keywords: ['美食', '食物', '餐饮', '料理', '吃'], w: 1600, h: 1067, source: 'pexels' },
  { id: '19240003', category: '美食', label: '点心饮品', keywords: ['美食', '食物', '餐饮', '点心'], w: 1600, h: 1067, source: 'pexels' },
  { id: '24866519', category: '美食', label: '沙拉', keywords: ['美食', '沙拉', '健康', '轻食', '蔬菜'], w: 1600, h: 1067, source: 'pexels' },

  // ==== 补充：科技（Pexels 真实抓取）====
  { id: '6913227', category: '科技', label: '平板电脑', keywords: ['科技', '平板', '数码', '电子', '设备'], w: 1600, h: 1067, source: 'pexels' },
  { id: '7241421', category: '科技', label: 'VR设备', keywords: ['科技', 'VR', '虚拟现实', '数码', '智能'], w: 1600, h: 1067, source: 'pexels' },
  { id: '18734876', category: '科技', label: '硬盘', keywords: ['科技', '硬盘', '硬件', '数码'], w: 1600, h: 1067, source: 'pexels' },
  { id: '20877035', category: '科技', label: '3D打印', keywords: ['科技', '3D打印', '数码', '设备'], w: 1600, h: 1067, source: 'pexels' },
  { id: '4373997', category: '科技', label: '光纤', keywords: ['科技', '光纤', '网络', '数码'], w: 1600, h: 1067, source: 'pexels' },
  { id: '8439002', category: '科技', label: '科研', keywords: ['科技', '科研', '实验', '科学'], w: 1600, h: 1067, source: 'pexels' },
  { id: '4955393', category: '科技', label: '显示器', keywords: ['科技', '显示器', '电脑', '数码'], w: 1600, h: 1067, source: 'pexels' },

  // ==== 补充：自然（Pexels 真实抓取）====
  { id: '12377231', category: '自然', label: '森林绿树', keywords: ['自然', '森林', '绿色', '环保', '环境', '树'], w: 1600, h: 1067, source: 'pexels' },
  { id: '32228687', category: '自然', label: '森林阳光', keywords: ['自然', '森林', '环保', '阳光', '环境'], w: 1600, h: 1067, source: 'pexels' },
  { id: '34021102', category: '自然', label: '湖景', keywords: ['自然', '湖', '风景', '山水', '环境'], w: 1600, h: 1067, source: 'pexels' },
  { id: '32730210', category: '自然', label: '森林溪流', keywords: ['自然', '森林', '溪流', '环保', '水'], w: 1600, h: 1067, source: 'pexels' },
  { id: '16767121', category: '自然', label: '湖畔树林', keywords: ['自然', '湖', '树', '风景', '环境'], w: 1600, h: 1067, source: 'pexels' },
  { id: '32711479', category: '自然', label: '森林光', keywords: ['自然', '森林', '光', '环保', '环境'], w: 1600, h: 1067, source: 'pexels' },
  { id: '13248795', category: '自然', label: '日落河景', keywords: ['自然', '日落', '河', '风景', '环境'], w: 1600, h: 1067, source: 'pexels' },
  { id: '29159501', category: '自然', label: '森林野餐', keywords: ['自然', '森林', '野餐', '环保', '环境'], w: 1600, h: 1067, source: 'pexels' },

  // ==== 补充：水厂 / 水务 / 工业（Pexels 真实抓取，内容已确认）====
  { id: '27490881', category: '水厂', label: '水厂净化池', keywords: ['水厂', '污水处理', '净水', '水务', '水处理', '自来水', '环保工程'], w: 1600, h: 1067, source: 'pexels' },
  { id: '12571590', category: '水厂', label: '乡间工业厂房', keywords: ['水厂', '工业', '厂房', '工厂', '制造业'], w: 1600, h: 1067, source: 'pexels' },
  { id: '35425761', category: '水厂', label: '水处理设施航拍', keywords: ['水厂', '水处理', '净水设施', '水务', '污水厂'], w: 1600, h: 1067, source: 'pexels' },
  { id: '24802113', category: '水厂', label: '净水设施航拍', keywords: ['水厂', '净水', '水处理', '净化', '水务'], w: 1600, h: 1067, source: 'pexels' },
  { id: '35627363', category: '水厂', label: '水处理设施', keywords: ['水厂', '水处理', '净水', '设施', '污水'], w: 1600, h: 1067, source: 'pexels' },
  { id: '5712211', category: '水厂', label: '污水处理厂航拍', keywords: ['水厂', '污水', '处理厂', '环保', '水务'], w: 1600, h: 1067, source: 'pexels' },
  { id: '27490882', category: '水厂', label: '水厂航拍', keywords: ['水厂', '水处理', '净水', '航拍', '水务'], w: 1600, h: 1067, source: 'pexels' },
  { id: '5092287', category: '水厂', label: '水处理排气设备', keywords: ['水厂', '水处理', '设备', '净水', '工业'], w: 1600, h: 1067, source: 'pexels' },
  { id: '12726229', category: '水厂', label: '水厂净化器', keywords: ['水厂', '净水器', '水处理', '净化', '设备'], w: 1600, h: 1067, source: 'pexels' },
  { id: '4741970', category: '水厂', label: '污水处理池', keywords: ['水厂', '污水', '处理池', '净水', '环保'], w: 1600, h: 1067, source: 'pexels' },
  { id: '35425759', category: '水厂', label: '现代净水设施', keywords: ['水厂', '净水', '水处理', '设施', '现代'], w: 1600, h: 1067, source: 'pexels' },
  { id: '3808769', category: '水厂', label: '污水处理厂', keywords: ['水厂', '污水', '处理厂', '环保', '水务'], w: 1600, h: 1067, source: 'pexels' },

  // ==== 补充：工厂 / 工业 / 制造（Pexels 真实抓取，内容已确认）====
  { id: '36915547', category: '工厂', label: '蓝天下的工业设施', keywords: ['工厂', '工业', '厂房', '制造业', '车间'], w: 1600, h: 1067, source: 'pexels' },
  { id: '28572048', category: '工厂', label: '砖砌烟囱工厂', keywords: ['工厂', '烟囱', '工业', '制造', '厂房'], w: 1600, h: 1067, source: 'pexels' },
  { id: '36794532', category: '工厂', label: '水泥工厂', keywords: ['工厂', '水泥', '工业', '制造', '厂房'], w: 1600, h: 1067, source: 'pexels' },
  { id: '29289938', category: '工厂', label: '工业园区航拍', keywords: ['工厂', '工业', '园区', '厂房', '制造'], w: 1600, h: 1067, source: 'pexels' },
  { id: '5115940', category: '工厂', label: '城市仓储', keywords: ['工厂', '仓储', '物流', '厂房', '工业'], w: 1600, h: 1067, source: 'pexels' },
  { id: '5470449', category: '工厂', label: '日落工业厂房', keywords: ['工厂', '工业', '厂房', '日落', '制造'], w: 1600, h: 1067, source: 'pexels' },
  { id: '33626643', category: '工厂', label: '工业厂房群航拍', keywords: ['工厂', '工业', '厂房', '制造', '园区'], w: 1600, h: 1067, source: 'pexels' },
  { id: '15866139', category: '工厂', label: '管道工厂建筑', keywords: ['工厂', '管道', '工业', '厂房', '制造'], w: 1600, h: 1067, source: 'pexels' },
  { id: '37125625', category: '工厂', label: '蓝天下的工业厂房', keywords: ['工厂', '工业', '厂房', '排放', '制造'], w: 1600, h: 1067, source: 'pexels' },
  { id: '6754764', category: '工厂', label: '工业建筑航拍', keywords: ['工厂', '工业', '建筑', '厂房', '航拍'], w: 1600, h: 1067, source: 'pexels' },
  { id: '3732951', category: '工厂', label: '工业区航拍', keywords: ['工厂', '工业', '区域', '厂房', '制造'], w: 1600, h: 1067, source: 'pexels' },

  // ==== 补充：茶 / 茶叶（Pexels 真实抓取，内容已确认）====
  { id: '11285384', category: '茶', label: '窗边茶杯', keywords: ['茶', '茶叶', '茶杯', '喝茶', '茶饮', '龙井', '绿茶'], w: 1600, h: 1067, source: 'pexels' },
  { id: '17286803', category: '茶', label: '倒茶', keywords: ['茶', '茶叶', '倒茶', '茶壶', '喝茶', '茶饮'], w: 1600, h: 1067, source: 'pexels' },
  { id: '38410813', category: '茶', label: '热茶托盘', keywords: ['茶', '茶叶', '热茶', '茶杯', '喝茶', '茶饮'], w: 1600, h: 1067, source: 'pexels' },
  { id: '9132518', category: '茶', label: '玻璃杯茶', keywords: ['茶', '茶叶', '茶杯', '喝茶', '饮品', '茶饮'], w: 1600, h: 1067, source: 'pexels' },
  { id: '10258207', category: '茶', label: '茶壶茶杯', keywords: ['茶', '茶叶', '茶壶', '茶杯', '茶具', '喝茶'], w: 1600, h: 1067, source: 'pexels' },
  { id: '5946807', category: '茶', label: '倒红茶', keywords: ['茶', '茶叶', '红茶', '倒茶', '喝茶', '茶饮'], w: 1600, h: 1067, source: 'pexels' },
  { id: '14668682', category: '茶', label: '倒茶特写', keywords: ['茶', '茶叶', '倒茶', '茶具', '喝茶'], w: 1600, h: 1067, source: 'pexels' },
  { id: '12698360', category: '茶', label: '茶杯茶壶', keywords: ['茶', '茶叶', '茶杯', '茶壶', '茶具'], w: 1600, h: 1067, source: 'pexels' },
  { id: '6694154', category: '茶', label: '草本茶', keywords: ['茶', '茶叶', '草本', '健康', '喝茶'], w: 1600, h: 1067, source: 'pexels' },
  { id: '35480225', category: '茶', label: '节日茶杯', keywords: ['茶', '茶叶', '茶杯', '节日', '喝茶'], w: 1600, h: 1067, source: 'pexels' },
  { id: '31474385', category: '茶', label: '玻璃茶壶', keywords: ['茶', '茶叶', '茶壶', '花草茶', '喝茶'], w: 1600, h: 1067, source: 'pexels' },
  { id: '35650189', category: '茶', label: '雪景热茶', keywords: ['茶', '茶叶', '热茶', '冬天', '雪', '喝茶'], w: 1600, h: 1067, source: 'pexels' },

  // ==== 补充：奶茶 / 茶饮（Pexels 真实抓取）====
  { id: '9271564', category: '奶茶', label: '木桌奶茶', keywords: ['奶茶', '茶饮', '饮品', '饮料', '牛奶茶'], w: 1600, h: 1067, source: 'pexels' },
  { id: '6412836', category: '奶茶', label: '手拿奶茶', keywords: ['奶茶', '茶饮', '饮品', '饮料'], w: 1600, h: 1067, source: 'pexels' },
  { id: '34511977', category: '奶茶', label: '冰珍珠奶茶', keywords: ['奶茶', '珍珠奶茶', '茶饮', '饮品', '饮料', '波霸'], w: 1600, h: 1067, source: 'pexels' },
  { id: '11160112', category: '奶茶', label: '珍珠果昔', keywords: ['奶茶', '珍珠', '茶饮', '饮品', '饮料'], w: 1600, h: 1067, source: 'pexels' },
  { id: '6412839', category: '奶茶', label: '手持奶茶杯', keywords: ['奶茶', '茶饮', '饮品', '饮料'], w: 1600, h: 1067, source: 'pexels' },
  { id: '32927743', category: '奶茶', label: '木桌珍珠奶茶', keywords: ['奶茶', '珍珠奶茶', '茶饮', '饮品', '波霸'], w: 1600, h: 1067, source: 'pexels' },
  { id: '35727299', category: '奶茶', label: '奶盖奶茶', keywords: ['奶茶', '奶盖', '茶饮', '饮品', '饮料'], w: 1600, h: 1067, source: 'pexels' },
  { id: '35137078', category: '奶茶', label: '阳光冰奶茶', keywords: ['奶茶', '冰奶茶', '茶饮', '饮品', '饮料'], w: 1600, h: 1067, source: 'pexels' },
  { id: '12666754', category: '奶茶', label: '珍珠奶茶杯', keywords: ['奶茶', '珍珠奶茶', '茶饮', '饮品', '波霸'], w: 1600, h: 1067, source: 'pexels' },
  { id: '27126830', category: '奶茶', label: '奶茶特写', keywords: ['奶茶', '茶饮', '饮品', '饮料'], w: 1600, h: 1067, source: 'pexels' },

  // ==== 补充：火锅 / 美食（Pexels 真实抓取）====
  { id: '30915727', category: '火锅', label: '中式火锅', keywords: ['火锅', '美食', '餐饮', '料理', '麻辣'], w: 1600, h: 1067, source: 'pexels' },
  { id: '29479440', category: '火锅', label: '火锅食材', keywords: ['火锅', '美食', '餐饮', '料理', '食材'], w: 1600, h: 1067, source: 'pexels' },
  { id: '29479438', category: '火锅', label: '美味火锅', keywords: ['火锅', '美食', '餐饮', '料理'], w: 1600, h: 1067, source: 'pexels' },
  { id: '29479439', category: '火锅', label: '亚洲火锅', keywords: ['火锅', '美食', '餐饮', '料理'], w: 1600, h: 1067, source: 'pexels' },
  { id: '37172939', category: '火锅', label: '木桌火锅', keywords: ['火锅', '美食', '餐饮', '料理', '木桌'], w: 1600, h: 1067, source: 'pexels' },
  { id: '11089809', category: '火锅', label: '锅中食材', keywords: ['火锅', '美食', '烹饪', '餐饮', '汤'], w: 1600, h: 1067, source: 'pexels' },
  { id: '6063231', category: '火锅', label: '蔬菜汤', keywords: ['火锅', '美食', '汤', '餐饮', '蔬菜'], w: 1600, h: 1067, source: 'pexels' },
  { id: '8178437', category: '火锅', label: '陶锅料理', keywords: ['火锅', '美食', '料理', '餐饮', '陶锅'], w: 1600, h: 1067, source: 'pexels' },

  // ==== 补充：马拉松 / 跑步（Pexels 真实抓取）====
  { id: '29840319', category: '马拉松', label: '马拉松选手', keywords: ['马拉松', '跑步', '运动', '比赛', '健身', '体育'], w: 1600, h: 1067, source: 'pexels' },
  { id: '28907576', category: '马拉松', label: '城市马拉松', keywords: ['马拉松', '跑步', '运动', '比赛', '城市', '体育'], w: 1600, h: 1067, source: 'pexels' },
  { id: '35388268', category: '马拉松', label: '山路马拉松', keywords: ['马拉松', '跑步', '运动', '山路', '体育'], w: 1600, h: 1067, source: 'pexels' },
  { id: '29151596', category: '马拉松', label: '街头马拉松', keywords: ['马拉松', '跑步', '运动', '街头', '比赛'], w: 1600, h: 1067, source: 'pexels' },
  { id: '10168171', category: '马拉松', label: '跑步剪影', keywords: ['马拉松', '跑步', '运动', '剪影', '体育'], w: 1600, h: 1067, source: 'pexels' },
  { id: '29840338', category: '马拉松', label: '晨跑比赛', keywords: ['马拉松', '跑步', '运动', '比赛', '晨跑'], w: 1600, h: 1067, source: 'pexels' },
  { id: '10226364', category: '马拉松', label: '公路跑步', keywords: ['马拉松', '跑步', '运动', '公路', '体育'], w: 1600, h: 1067, source: 'pexels' },
  { id: '28907540', category: '马拉松', label: '悉尼马拉松', keywords: ['马拉松', '跑步', '运动', '城市', '比赛'], w: 1600, h: 1067, source: 'pexels' },
  { id: '18521752', category: '马拉松', label: '跳跃马拉松', keywords: ['马拉松', '跑步', '运动', '跳跃', '体育'], w: 1600, h: 1067, source: 'pexels' },
  { id: '36609323', category: '马拉松', label: '巴塞罗那马拉松', keywords: ['马拉松', '跑步', '运动', '比赛', '城市'], w: 1600, h: 1067, source: 'pexels' },
  { id: '2526889', category: '马拉松', label: '跑步者', keywords: ['马拉松', '跑步', '运动', '体育', '健身'], w: 1600, h: 1067, source: 'pexels' },
  { id: '33608349', category: '马拉松', label: '冲线时刻', keywords: ['马拉松', '跑步', '终点', '运动', '比赛'], w: 1600, h: 1067, source: 'pexels' },

  // ==== 补充：鲜花 / 花朵（Pexels 真实抓取）====
  { id: '40234150', category: '鲜花', label: '鲜花', keywords: ['鲜花', '花', '花朵', '玫瑰', '自然'], w: 1600, h: 1067, source: 'pexels' },
  { id: '38007128', category: '鲜花', label: '花朵', keywords: ['鲜花', '花', '花朵', '自然', '植物'], w: 1600, h: 1067, source: 'pexels' },
  { id: '31099775', category: '鲜花', label: '鲜花特写', keywords: ['鲜花', '花', '花朵', '自然'], w: 1600, h: 1067, source: 'pexels' },
  { id: '37335894', category: '鲜花', label: '花束', keywords: ['鲜花', '花', '花束', '花朵', '礼物'], w: 1600, h: 1067, source: 'pexels' },
  { id: '19325010', category: '鲜花', label: '花朵', keywords: ['鲜花', '花', '花朵', '自然'], w: 1600, h: 1067, source: 'pexels' },
  { id: '11554084', category: '鲜花', label: '鲜花', keywords: ['鲜花', '花', '花朵', '玫瑰'], w: 1600, h: 1067, source: 'pexels' },
  { id: '12220521', category: '鲜花', label: '花朵', keywords: ['鲜花', '花', '花朵', '自然'], w: 1600, h: 1067, source: 'pexels' },
  { id: '6702059', category: '鲜花', label: '花', keywords: ['鲜花', '花', '花朵', '自然'], w: 1600, h: 1067, source: 'pexels' },
  { id: '28279006', category: '鲜花', label: '鲜花', keywords: ['鲜花', '花', '花朵', '植物'], w: 1600, h: 1067, source: 'pexels' },
  { id: '35802554', category: '鲜花', label: '花朵', keywords: ['鲜花', '花', '花朵', '自然'], w: 1600, h: 1067, source: 'pexels' },
  { id: '7948148', category: '鲜花', label: '鲜花', keywords: ['鲜花', '花', '花朵', '玫瑰', '自然'], w: 1600, h: 1067, source: 'pexels' },
  { id: '12373597', category: '鲜花', label: '花朵', keywords: ['鲜花', '花', '花朵', '植物'], w: 1600, h: 1067, source: 'pexels' },

  // ==== 补充：新年 / 春节 / 灯笼（Pexels 真实抓取）====
  { id: '19121466', category: '春节', label: '纸灯笼', keywords: ['春节', '新年', '灯笼', '节日', '中国传统', '国风'], w: 1600, h: 1067, source: 'pexels' },
  { id: '20006359', category: '春节', label: '传统装饰', keywords: ['春节', '新年', '传统', '节日', '国风'], w: 1600, h: 1067, source: 'pexels' },
  { id: '34443046', category: '春节', label: '舞狮表演', keywords: ['春节', '新年', '舞狮', '节日', '中国传统'], w: 1600, h: 1067, source: 'pexels' },
  { id: '5982949', category: '春节', label: '红灯笼', keywords: ['春节', '新年', '灯笼', '节日', '红'], w: 1600, h: 1067, source: 'pexels' },
  { id: '7364211', category: '春节', label: '红色装饰', keywords: ['春节', '新年', '装饰', '节日', '红', '国风'], w: 1600, h: 1067, source: 'pexels' },
  { id: '29715852', category: '春节', label: '蓝天灯笼', keywords: ['春节', '新年', '灯笼', '节日', '国风'], w: 1600, h: 1067, source: 'pexels' },
  { id: '14512855', category: '春节', label: '柱间灯笼', keywords: ['春节', '新年', '灯笼', '节日', '中国传统'], w: 1600, h: 1067, source: 'pexels' },
  { id: '30918012', category: '春节', label: '新春横幅', keywords: ['春节', '新年', '横幅', '节日', '国风'], w: 1600, h: 1067, source: 'pexels' },
  { id: '38712589', category: '春节', label: '户外灯笼', keywords: ['春节', '新年', '灯笼', '节日', '红'], w: 1600, h: 1067, source: 'pexels' },
  { id: '19938787', category: '春节', label: '红灯笼串', keywords: ['春节', '新年', '灯笼', '节日', '红'], w: 1600, h: 1067, source: 'pexels' },
  { id: '30125651', category: '春节', label: '新春装饰红果', keywords: ['春节', '新年', '装饰', '节日', '红果'], w: 1600, h: 1067, source: 'pexels' },
  { id: '37272344', category: '春节', label: '夜间灯笼', keywords: ['春节', '新年', '灯笼', '夜晚', '节日'], w: 1600, h: 1067, source: 'pexels' },
  { id: '16133738', category: '春节', label: '天花板灯笼', keywords: ['春节', '新年', '灯笼', '节日', '红'], w: 1600, h: 1067, source: 'pexels' },
  { id: '36692248', category: '春节', label: '春联书法', keywords: ['春节', '新年', '春联', '书法', '国风'], w: 1600, h: 1067, source: 'pexels' },
  { id: '20485885', category: '春节', label: '手工红灯笼', keywords: ['春节', '新年', '灯笼', '手工', '节日'], w: 1600, h: 1067, source: 'pexels' },
]

export function getLocalImagePool() {
  return POOL
}

// 关键词 → 匹配图片（按关键词命中数排序）
export function searchLocalPool(query, { limit = 24, seed = 0 } = {}) {
  let q = String(query || '').trim().toLowerCase()
  if (!q) return []
  // 去掉常见后缀/语气词，让"环境类""咖啡海报"能命中核心词
  q = q.replace(/[类海报图底素材版式模板宣传主视觉封面配图]/g, '').trim()
  if (!q) return []

  // 同义词/近义词映射，扩大命中
  const SYNONYMS = {
    '环境': ['环保', '自然', '森林', '绿色', '生态'],
    '环保': ['环境', '自然', '森林', '绿色', '生态'],
    '招聘': ['求职', '工作', '面试', '岗位', '商务'],
    '求职': ['招聘', '工作', '面试', '岗位'],
    '美食': ['餐饮', '食物', '料理', '餐厅'],
    '餐饮': ['美食', '食物', '料理', '餐厅'],
    '科技': ['AI', '人工智能', '数码', '电子', '智能'],
    '汽车': ['车', '轿车', '跑车', '驾驶'],
    '旅游': ['旅行', '度假', '风景', '户外'],
    '旅行': ['旅游', '度假', '风景', '户外'],
    '健康': ['医疗', '养生', '保健'],
    '医疗': ['健康', '医生', '医院'],
    '美妆': ['化妆', '护肤', '美容', '彩妆'],
    '婚礼': ['婚庆', '结婚', '浪漫'],
    '婚庆': ['婚礼', '结婚'],
    '房产': ['楼盘', '房屋', '住宅', '房地产'],
    // 情人节 / 爱情主题同义词，命中任意一个即扩大检索范围
    '情人节': ['爱情', '浪漫', '玫瑰', '爱心', '情侣', '恋爱', '表白', '礼物', '红心'],
    '七夕': ['情人节', '爱情', '浪漫', '玫瑰', '爱心', '情侣', '恋爱'],
    '520': ['情人节', '爱情', '浪漫', '玫瑰', '爱心', '情侣'],
    '爱情': ['情人节', '浪漫', '玫瑰', '爱心', '情侣', '恋爱'],
    '浪漫': ['爱情', '玫瑰', '爱心', '情侣', '情人节'],
    '告白': ['表白', '爱情', '浪漫', '情侣', '礼物'],
    '玫瑰': ['爱情', '浪漫', '情人节', '花朵', '红'],
    // 水厂 / 工厂 / 工业类
    '水厂': ['水处理', '净水', '水务', '污水处理', '自来水', '污水厂'],
    '净水': ['水厂', '水处理', '水务', '净化'],
    '水处理': ['水厂', '净水', '水务', '污水'],
    '污水处理': ['水厂', '污水', '净水', '水务', '环保'],
    '工厂': ['工业', '厂房', '制造', '车间', '制造业'],
    '工业': ['工厂', '厂房', '制造', '制造业', '车间'],
    '制造': ['工厂', '工业', '厂房', '车间'],
    '车间': ['工厂', '工业', '制造', '厂房'],
    // 茶 / 饮品类（中国用户高频；本地池若无茶图则走 AI 兜底，避免误映射到咖啡导致图文不符）
    '茶': ['茶叶', '茶饮', '喝茶', '绿茶', '红茶'],
    '茶叶': ['茶', '龙井', '绿茶', '茶饮'],
    '龙井': ['茶叶', '茶', '绿茶', '茶饮'],
    '绿茶': ['茶', '茶叶', '龙井'],
    '红茶': ['茶', '茶叶'],
    '奶茶': ['茶饮', '饮料', '饮品'],
    '茶饮': ['奶茶', '饮料', '饮品', '茶'],
    '饮料': ['饮品', '茶饮', '奶茶'],
    '饮品': ['饮料', '茶饮', '奶茶', '咖啡'],
    // 更多中国用户高频词
    '火锅': ['美食', '餐饮', '料理', '食物', '餐厅'],
    '蛋糕': ['美食', '甜点', '餐饮', '烘焙'],
    '甜点': ['美食', '蛋糕', '餐饮', '烘焙'],
    '烘焙': ['美食', '蛋糕', '甜点', '面包'],
    '面包': ['美食', '烘焙', '餐饮', '食物'],
    '健身': ['运动', '锻炼', '健身房', '体育'],
    '瑜伽': ['运动', '健身', '健康', '锻炼'],
    '跑步': ['运动', '健身', '锻炼', '体育', '马拉松'],
    '马拉松': ['跑步', '运动', '健身', '比赛', '体育'],
    '读书': ['教育', '学习', '书', '阅读'],
    '阅读': ['教育', '读书', '学习', '书'],
    '书': ['教育', '读书', '阅读', '学习'],
    '鲜花': ['花', '玫瑰', '春天', '自然'],
    '花': ['鲜花', '玫瑰', '春天', '自然', '樱花'],
    '水果': ['美食', '食物', '健康', '餐饮'],
    '数码': ['科技', '电子', '设备', '智能'],
    '手机': ['科技', '数码', '电子', '智能'],
    '电脑': ['科技', '数码', '电子', '办公'],
    '家居': ['房产', '房屋', '室内', '生活'],
    '室内': ['家居', '房产', '设计', '建筑'],
    '职场': ['商务', '办公', '工作', '招聘'],
    '工作': ['商务', '办公', '职场', '招聘'],
    // 更多节日/节气
    '新年': ['春节', '节日', '庆典', '春节'],
    '端午': ['节日', '传统', '庆典'],
    '元宵': ['节日', '传统', '春节'],
    '中秋': ['节日', '月亮', '传统'],
    '月亮': ['中秋', '节日', '夜晚'],
    '传统': ['节日', '文化', '庆典'],
    '国风': ['艺术', '设计', '传统', '文化'],
    '文化': ['艺术', '传统', '教育'],
  }
  // 关键修复：不再把「整串 query」当作一个 term 去做 includes 匹配（那会导致
  // "新能源汽车充电桩"因含"汽车"二字而误命中跑车图、"空气净化器"因含"净化"而误命中净水设施）。
  // 改为：先把 query 切分成「候选词」，再用词做精确/包含匹配。
  const terms = tokenizeQuery(q)
  const expandTerms = new Set(terms)
  // 同义词只对「精确命中某个词」的候选词展开，避免整串包含误触。
  for (const term of terms) {
    if (SYNONYMS[term]) SYNONYMS[term].forEach((s) => expandTerms.add(s))
  }
  // 原始词（用户输入的直接词）权重更高，避免"火锅"被同义词"美食"淹没。
  // 例如"火锅"应优先返回火锅图，而非一堆泛美食图。
  const primarySet = new Set(terms)
  const isPrimary = (term) => primarySet.has(term)

  // 匹配打分：完整词相等 > 词是关键词的连续子串 > 关键词是词的子串（均要求 ≥2 字）。
  // 歧义消解（放宽版）：query 含 ≥3 字具体词（如"充电桩""净化器"）时，这些长词是用户意图的主导。
  // 只有当「长词无命中，且没有任何短词/同义词命中」时才返回空（交给 AI 生图兜底），
  // 否则降级到短词/同义词的命中结果，保证用户始终能搜到相关图（而非"搜不到"）。
  const longTerms = [...expandTerms].filter((t) => t.length >= 3)
  const longTermHasHit = longTerms.some((term) =>
    POOL.some((img) =>
      (img.category && (img.category === term || img.category.includes(term))) ||
      (img.keywords || []).some((kw) => kw === term || kw.includes(term))
    )
  )

  const scored = POOL.map((img) => {
    let score = 0
    // 1) 命中分类（最高权重）；单字词只允许精确相等；原始词权重 ×1.5
    for (const term of expandTerms) {
      const w = isPrimary(term) ? 1.5 : 1
      if (img.category && term === img.category) score += 8 * w
      else if (img.category && term.length >= 2 && img.category.includes(term)) score += 5 * w
    }
    // 2) 命中 label
    for (const term of expandTerms) {
      const w = isPrimary(term) ? 1.5 : 1
      if (img.label && term === img.label) score += 6 * w
      else if (img.label && term.length >= 2 && img.label.includes(term)) score += 3 * w
    }
    // 3) 命中关键词；单字词只允许精确相等（"茶"→"茶"），避免单字子串穿透
    for (const kw of img.keywords) {
      for (const term of expandTerms) {
        const w = isPrimary(term) ? 1.5 : 1
        if (kw === term) score += 4 * w
        else if (kw.length >= 2 && term.length >= 2 && kw.includes(term)) score += 2 * w
      }
    }
    return { img, score }
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score)

  const results = scored.map((x) => x.img)
  // 放宽：只有「长词无命中且短词也无任何命中」时才返回空（触发 AI 生图兜底）。
  // 若短词/同义词有命中（如"龙井茶叶"→"茶"→命中饮品/咖啡），则保留这些降级结果，
  // 避免用户"搜不到任何图"。
  if (results.length === 0) return []
  // 长词主导词存在但完全无命中，且降级结果里没有任何「同义词命中」（score 来自短词匹配）
  // 时才清空，避免"新能源汽车充电桩"这类错误返回跑车。判断依据：结果里是否含长词精确命中。
  if (longTerms.length > 0 && !longTermHasHit) {
    // 长词无命中：检查降级结果是否真的相关（score 是否来自短词/同义词的强匹配）
    // 若只有极弱的子串命中（score 很低），倾向返回空交给 AI；否则保留降级结果。
    const bestScore = scored.length ? scored[0].score : 0
    if (bestScore < 4) return []
  }
  return results.slice(0, limit)
}

// 轻量中文切词：基于 POOL 词典做正向最大匹配，剩余部分用滑动子串兜底。
// 输出的是「词」，不是整串，避免整串 includes 造成的误命中。
const TOKEN_DICT = (() => {
  const set = new Set()
  for (const img of POOL) {
    if (img.category) set.add(img.category)
    if (img.label) set.add(img.label)
    for (const kw of img.keywords || []) set.add(kw)
  }
  // 补充常见海报实体词 + 同义词 key，增强切词准确性（确保同义词能命中）
  const EXTRA = ['新能源', '汽车', '充电桩', '充电', '净化器', '空气', '净化', '茶叶', '龙井', '马拉松', '跑步', '水厂', '污水处理', '净水', '工业', '工厂', '咖啡', '咖啡店', '情人节', '七夕',
    '茶', '绿茶', '红茶', '奶茶', '茶饮', '饮料', '饮品', '火锅', '蛋糕', '甜点', '烘焙', '面包', '健身', '瑜伽', '读书', '阅读', '书', '鲜花', '花', '水果', '数码', '手机', '电脑', '家居', '室内', '职场', '工作', '新年', '端午', '元宵', '中秋', '月亮', '传统', '国风', '文化', '环境', '环保', '招聘', '求职', '美食', '餐饮', '科技', '旅游', '旅行', '健康', '医疗', '美妆', '婚礼', '婚庆', '房产', '爱情', '浪漫', '告白', '玫瑰', '爱心', '情侣']
  EXTRA.forEach((w) => set.add(w))
  return [...set].sort((a, b) => b.length - a.length)
})()

function tokenizeQuery(q) {
  const tokens = new Set()
  // 正向最大匹配切词（最长词优先，保证"污水处理"优先于"水""处理"）
  let rest = q
  while (rest.length > 0) {
    let matched = null
    for (const word of TOKEN_DICT) {
      if (rest.startsWith(word)) { matched = word; break }
    }
    if (matched) {
      tokens.add(matched)
      rest = rest.slice(matched.length)
    } else {
      // 未命中字符：尝试收集连续的一段中文/字母作为一个"未知词"整体加入，
      // 这样同义词映射和匹配仍有机会命中（否则这些词被逐个丢弃，导致搜不到）。
      const m = rest.match(/^[\u4e00-\u9fa5a-zA-Z0-9]{2,}/)
      if (m) {
        tokens.add(m[0])
        rest = rest.slice(m[0].length)
      } else {
        rest = rest.slice(1)
      }
    }
  }
  // 保留单字词（如"茶""花""书"），但仅当它是「词典里的完整词」时才保留，
  // 避免把普通单字（如"的""了"）也当作匹配词。
  return [...tokens].filter((t) => t && (t.length >= 2 || TOKEN_DICT.includes(t)))
}

export function toPhoto(img) {
  const isPexels = img.source === 'pexels'
  return {
    id: img.id,
    provider: 'local',
    sourceName: isPexels ? 'Pexels 图库' : 'Unsplash 图库',
    description: `${img.label} · ${img.category}`,
    url: isPexels ? PX(img.id) : P(img.id),
    thumb: isPexels ? PXT(img.id) : PT(img.id),
    photographer: isPexels ? 'Pexels 摄影师' : 'Unsplash 摄影师',
    profileUrl: isPexels ? `https://www.pexels.com/photo/${img.id}/` : `https://unsplash.com/photos/${img.id}`,
    sourceUrl: isPexels ? `https://www.pexels.com/photo/${img.id}/` : `https://unsplash.com/photos/${img.id}`,
    license: isPexels ? 'Pexels License' : 'Unsplash License',
    width: img.w,
    height: img.h,
  }
}
