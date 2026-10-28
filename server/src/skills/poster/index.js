/**
 * Poster design skill pipeline. These are app-side domain skills (instructions +
 * deterministic checks), not Codex-specific skill packages.
 */
export const posterSkills = {
  referenceAnalysis: `你是资深平面设计总监。只分析用户上传图片的视觉语言，不复刻原图文案、Logo、人物身份或独特版式。提取：主辅色、光线、材质、主体类型、视觉重心、信息层级、留白区、字体气质。用简体中文返回 JSON，palette 必须是 3 个 #RRGGBB 色值，并含 paletteNotes、composition、typography、whitespace、decoration。`,
  artDirection: `将海报 brief 转为摄影/插画主视觉的艺术指导。优先真实材质、自然光影、明确主体和纵深环境，避免纯色块、抽象几何占位、卡片式拼贴、文字乱码、水印、Logo。若提供图库图，保持图片主体突出，不用遮挡性渐变覆盖主体。必须为后续独立排版留出干净区域。`,
  layout: `海报设计排版：保留用户文案原文，不得改字或把文字烘焙进背景图；标题、说明、日期、CTA 有清晰字号层级与足够对比。先确定视线动线和安全边距，再安排图文。不同方案必须在主视觉位置、信息结构、留白分配上明显不同。`,
  preflight: `出图前检查：1) 主体是可辨认的摄影/插画内容，不是大片纯色占位；2) 标题和细节可读且有对比；3) 用户原文完整；4) 主体不被文字遮挡；5) 无伪造品牌、无水印、无乱码字；6) 所有内容在安全边距内。发现问题时先调整提示词或版式再输出。`,
}

export function makeArtPrompt({ prompt = '', purpose = '', content = {}, styleAnalysis = {}, stockAsset }) {
  const palette = Array.isArray(styleAnalysis.palette) ? styleAnalysis.palette.slice(0, 3).join(', ') : ''
  const brief = [
    `Use case: ads-marketing. Asset type: premium poster hero image for ${purpose || 'a promotional poster'}.`,
    `Primary request: ${prompt}`,
    `Subject: ${content.headline || purpose || 'A compelling campaign subject'}.`,
    `Style and palette: ${styleAnalysis.paletteNotes || ''} ${palette}`,
    `Composition: ${styleAnalysis.composition || 'Create an editorial composition with a clear focal subject and depth.'}`,
    `Typography mood: ${styleAnalysis.typography || ''}`,
    `Whitespace: ${styleAnalysis.whitespace || 'Leave a clean negative-space zone for separately typeset Chinese copy.'}`,
    stockAsset ? `Selected stock photo: use it as the photographic background/subject source; preserve the actual photo subject and blend typography around it. Credit: ${stockAsset.credit || ''}` : '',
    posterSkills.layout,
    'Constraints: create a polished photographic or richly rendered illustrative scene with lighting, materials, and depth; do not create a flat vector placeholder. Do not render any text, logo, QR code, watermark, UI card, or fake lettering into the image. Preserve negative space for editable typeset copy.',
  ].filter(Boolean).join('\n')
  return `${posterSkills.artDirection}\n\n${posterSkills.preflight}\n\n${brief}`
}

export function validatePosterBrief({ content = {}, canvas = {} }) {
  const issues = []
  if (!content.headline?.trim()) issues.push('缺少主标题')
  if (!canvas.width || !canvas.height) issues.push('缺少画布尺寸')
  if (String(content.headline || '').length > 30) issues.push('主标题过长，建议拆分为标题与副标题')
  return issues
}
