/** Deterministic poster composition using a user-selected licensed stock photo. */
export class StockAdapter {
  constructor() { this.provider = 'stock' }
  get available() { return true }
  async generateImage({ stockAsset }) {
    if (!stockAsset?.url || !stockAsset?.id) throw new Error('素材渲染模式需要先选择一张图库素材')
    let url
    try { url = new URL(stockAsset.url) } catch { throw new Error('图库素材地址无效') }
    if (url.protocol !== 'https:' || !['unsplash', 'pexels', 'openverse'].includes(stockAsset.provider || 'unsplash')) throw new Error('图库素材地址或来源无效')
    if (stockAsset.provider === 'unsplash' && url.hostname !== 'images.unsplash.com') throw new Error('Unsplash 素材地址无效')
    if (stockAsset.provider === 'pexels' && url.hostname !== 'images.pexels.com') throw new Error('Pexels 素材地址无效')
    return { mock: false, source: stockAsset.provider || 'unsplash', model: `${stockAsset.provider || 'unsplash'}-layout-renderer`, content: '使用已选择的摄影素材进行版式渲染。' }
  }
}
