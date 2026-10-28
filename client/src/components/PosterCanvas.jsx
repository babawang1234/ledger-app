/**
 * PosterCanvas —— 浏览器端图层预览组件。
 * 文字作为独立文字层渲染（与后端排版引擎同构），保证"文字精准"承诺。
 */
export default function PosterCanvas({ canvas, background, layers, editable, onLayerUpdate, selectedId, onSelectLayer, scale = 'width' }) {
  const width = canvas?.width || 1080
  const height = canvas?.height || 1920

  const bgStyle = {}
  if (background?.gradient) {
    const stops = (background.gradientStops || [])
      .map((s) => `${s.color} ${Math.round(s.offset * 100)}%`)
      .join(', ')
    bgStyle.background = `linear-gradient(${background.angle ?? 135}deg, ${stops})`
  } else {
    bgStyle.background = background?.color || '#0a0a14'
  }

  const sorted = [...(layers || [])].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))

  function handleClick(e, layer) {
    if (!editable) return
    e.stopPropagation()
    onSelectLayer?.(layer)
  }

  function px(v, ref) {
    if (typeof v === 'number') return v <= 1 ? v * ref : v
    if (typeof v === 'string' && v.endsWith('%')) return (parseFloat(v) / 100) * ref
    return parseFloat(v) || 0
  }

  return (
    <div
      className="relative mx-auto overflow-hidden shadow-card"
      style={{ ...bgStyle, aspectRatio: `${width}/${height}`, width: '100%' }}
      onClick={() => editable && onSelectLayer?.(null)}
    >
      {background?.glow && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 40% at 50% 40%, rgba(124,92,255,0.3), transparent 70%)',
          }}
          aria-hidden
        />
      )}
      {sorted.map((layer, i) => {
        const id = layer.id ?? `layer-${i}`
        const selected = editable && selectedId === id
        if (layer.visible === false) return null
        if (layer.type === 'text') {
          const x = px(layer.x, width)
          const y = px(layer.y, height)
          const fs = px(layer.fontSize, width)
          const align = layer.align || 'left'
          const left = align === 'center' ? x : align === 'right' ? undefined : x
          const style = {
            position: 'absolute',
            top: y,
            fontSize: fs,
            fontWeight: layer.fontWeight || 400,
            color: layer.color || '#fff',
            textAlign: align,
            lineHeight: layer.lineHeight || 1.3,
            whiteSpace: 'pre-wrap',
            width: layer.maxWidth ? px(layer.maxWidth, width) : 'auto',
            ...(align === 'center' && !layer.maxWidth
              ? { left: 0, right: 0, transform: 'translateY(0)' }
              : align === 'center' && layer.maxWidth
              ? { left: x - px(layer.maxWidth, width) / 2 }
              : align === 'right'
              ? { right: px(layer.x, width) === 0 ? '7%' : undefined, left: '7%' }
              : { left: x }),
            zIndex: layer.zIndex ?? 0,
            ...(selected ? { outline: '2px solid #38d9f5', outlineOffset: 2 } : {}),
          }
          return (
            <div key={id} onClick={(e) => handleClick(e, { ...layer, id })} style={style} className={editable ? 'cursor-pointer' : ''}>
              {layer.text}
            </div>
          )
        }
        if (layer.type === 'shape') {
          const style = {
            position: 'absolute',
            left: px(layer.x, width),
            top: px(layer.y, height),
            width: px(layer.width, width),
            height: px(layer.height, height),
            background: layer.color || '#fff',
            opacity: layer.opacity ?? 1,
            borderRadius: layer.kind === 'circle' ? '50%' : layer.radius || 0,
            zIndex: layer.zIndex ?? 0,
            ...(selected ? { outline: '2px solid #38d9f5', outlineOffset: 2 } : {}),
          }
          return <div key={id} onClick={(e) => handleClick(e, { ...layer, id })} style={style} className={editable ? 'cursor-pointer' : ''} />
        }
        if (layer.type === 'image') {
          const style = {
            position: 'absolute',
            left: px(layer.x, width),
            top: px(layer.y, height),
            width: px(layer.width, width),
            height: px(layer.height, height),
            objectFit: layer.fit || 'cover',
            borderRadius: layer.radius || 0,
            zIndex: layer.zIndex ?? 0,
            ...(selected ? { outline: '2px solid #38d9f5', outlineOffset: 2 } : {}),
          }
          return (
            <img key={id} src={layer.src} alt="" onClick={(e) => handleClick(e, { ...layer, id })} style={style} className={editable ? 'cursor-pointer' : ''} />
          )
        }
        return null
      })}
    </div>
  )
}
