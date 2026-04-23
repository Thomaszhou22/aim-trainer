export interface GameResult {
  mode: string
  score: number
  accuracy: number
  avgTime: number
  date: string
}

export interface ModeDef {
  id: string
  name: string
  desc: string
  icon: string
  duration: number
  category: 'flicking' | 'precision' | 'tracking' | 'reaction' | 'speed'
  color: string
}

export const MODES: ModeDef[] = [
  // Flicking
  { id: 'gridshot', name: 'Gridshot', desc: '3个目标同时出现，点击后新目标补充', icon: '🎯', duration: 60, category: 'flicking', color: '#00ccff' },
  { id: 'multiclick', name: 'Multiclick', desc: '点击目标3次才能消除，每次缩小', icon: '👆', duration: 30, category: 'flicking', color: '#00ccff' },
  { id: 'sixshot', name: 'Sixshot', desc: '6个极小目标，全部击中后刷新', icon: '⬡', duration: 45, category: 'flicking', color: '#00ccff' },
  { id: 'spidershot', name: 'Spidershot', desc: '目标从中心向外扩展', icon: '🕸️', duration: 60, category: 'flicking', color: '#00ccff' },
  { id: 'motionshot', name: 'Motionshot', desc: '点击移动中的目标', icon: '💨', duration: 45, category: 'flicking', color: '#00ccff' },
  // Precision
  { id: 'microshot', name: 'Microshot', desc: '极小目标出现在中心附近', icon: '🔬', duration: 45, category: 'precision', color: '#ff9900' },
  { id: 'multitarget', name: 'Multitarget', desc: '找到绿色目标，忽略红色干扰', icon: '🎭', duration: 45, category: 'precision', color: '#ff9900' },
  // Tracking
  { id: 'strafetrack', name: 'Strafetrack', desc: '目标左右横移，持续跟踪', icon: '↔️', duration: 30, category: 'tracking', color: '#aa66ff' },
  { id: 'circleshoot', name: 'Circleshoot', desc: '目标沿圆形轨迹移动', icon: '🔄', duration: 30, category: 'tracking', color: '#aa66ff' },
  { id: 'reactiveshot', name: 'Reactiveshot', desc: '目标间歇出现，快速开始跟踪', icon: '👁️', duration: 30, category: 'tracking', color: '#aa66ff' },
  // Reaction
  { id: 'reaction', name: 'Reaction Time', desc: '等待变色后尽快点击', icon: '⚡', duration: 0, category: 'reaction', color: '#ffff00' },
  { id: 'detection', name: 'Detection', desc: '在多个目标中找到不同颜色的', icon: '🔍', duration: 0, category: 'reaction', color: '#ffff00' },
  // Speed
  { id: 'scattershot', name: 'Scattershot', desc: '目标快速出现，每个只存在0.8秒', icon: '💫', duration: 45, category: 'speed', color: '#ff3366' },
]

export const CATEGORIES = [
  { id: 'flicking' as const, name: 'Flicking', color: '#00ccff' },
  { id: 'precision' as const, name: 'Precision', color: '#ff9900' },
  { id: 'tracking' as const, name: 'Tracking', color: '#aa66ff' },
  { id: 'reaction' as const, name: 'Reaction', color: '#ffff00' },
  { id: 'speed' as const, name: 'Speed', color: '#ff3366' },
]

export function getHistory(): GameResult[] {
  try { return JSON.parse(localStorage.getItem('aim-history') || '[]') } catch { return [] }
}
export function saveHistory(r: GameResult) {
  const h = getHistory()
  h.push(r)
  localStorage.setItem('aim-history', JSON.stringify(h.slice(-100)))
}
export function getBest(mode: string): GameResult | null {
  const h = getHistory().filter(r => r.mode === mode)
  return h.length ? h.reduce((a, b) => b.score > a.score ? b : a) : null
}
