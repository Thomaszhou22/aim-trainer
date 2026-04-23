// Shared rendering utilities
import type { GameResult } from './types'
import { playHit, playMiss } from './audio'

export interface Target {
  x: number
  y: number
  r: number
  spawnTime: number
  scale: number
  color?: string
  vx?: number
  vy?: number
  clicksLeft?: number
  angle?: number
  angularV?: number
  orbitRadius?: number
  orbitCx?: number
  orbitCy?: number
  lifetime?: number
}

export interface GameState {
  running: boolean
  mode: string
  score: number
  hits: number
  clicks: number
  totalTime: number
  startTime: number
  duration: number
  targets: Target[]
  mouseX: number
  mouseY: number
  // reaction
  reactionRound: number
  reactionTimes: number[]
  reactionState: string
  reactionColorTime: number
  _reactionTimer?: ReturnType<typeof setTimeout>
  // tracking
  trackingTime: number
  trackingOnTarget: number
  accuracy: number
  // detection
  detectionRound: number
  // spidershot
  spiderRound: number
  // scattershot
  _scatterTimer?: ReturnType<typeof setTimeout>
  _cleanup?: () => void
  // for spawning logic
  _spawnTimer?: ReturnType<typeof setTimeout>
  _nextSpawnTime?: number
}

export function createTarget(x: number, y: number, r: number, color = '#00ccff'): Target {
  return { x, y, r, spawnTime: Date.now(), scale: 0, color }
}

export function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = '#111118'
  ctx.lineWidth = 1
  for (let x = 0; x < w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
  for (let y = 0; y < h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
}

export function drawTarget(ctx: CanvasRenderingContext2D, t: Target) {
  t.scale = Math.min(1, t.scale + 0.1)
  const r = t.r * t.scale
  const color = t.color || '#00ccff'
  // Glow
  const grad = ctx.createRadialGradient(t.x, t.y, r * 0.3, t.x, t.y, r * 1.6)
  grad.addColorStop(0, color + '33')
  grad.addColorStop(1, color + '00')
  ctx.fillStyle = grad
  ctx.beginPath(); ctx.arc(t.x, t.y, r * 1.6, 0, Math.PI * 2); ctx.fill()
  // Circle
  ctx.fillStyle = color + 'cc'
  ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2); ctx.fill()
  // Inner ring
  ctx.fillStyle = '#0a0a0f'
  ctx.beginPath(); ctx.arc(t.x, t.y, r * 0.55, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = color
  ctx.beginPath(); ctx.arc(t.x, t.y, r * 0.25, 0, Math.PI * 2); ctx.fill()
}

export function drawCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(x - 15, y); ctx.lineTo(x - 5, y); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 5, y); ctx.lineTo(x + 15, y); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x, y - 15); ctx.lineTo(x, y - 5); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x, y + 5); ctx.lineTo(x, y + 15); ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill()
}

export function drawHUD(ctx: CanvasRenderingContext2D, w: number, h: number, s: GameState, modeName: string) {
  // Mode name top center
  ctx.fillStyle = '#ffffff33'
  ctx.font = 'bold 18px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(modeName, w / 2, 35)
  // Timer top left
  const elapsed = (Date.now() - s.startTime) / 1000
  const timeLeft = Math.max(0, s.duration - elapsed)
  ctx.fillStyle = timeLeft < 5 ? '#ff3366' : '#ffffff'
  ctx.font = 'bold 22px monospace'
  ctx.textAlign = 'left'
  ctx.fillText(`${timeLeft.toFixed(1)}s`, 20, 40)
  // Score + accuracy top right
  ctx.fillStyle = '#00ff88'
  ctx.textAlign = 'right'
  ctx.fillText(`${s.score}`, w - 20, 40)
  const acc = s.clicks ? Math.round(s.hits / s.clicks * 100) : 100
  ctx.fillStyle = '#ffffff88'
  ctx.font = '16px monospace'
  ctx.fillText(`${acc}%`, w - 20, 62)
  // ESC hint
  ctx.fillStyle = '#ffffff33'
  ctx.font = '13px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('ESC 返回', w / 2, h - 20)
}

export function randomPos(w: number, h: number, margin: number): [number, number] {
  return [margin + Math.random() * (w - 2 * margin), margin + Math.random() * (h - 2 * margin)]
}

export function hitTest(mx: number, my: number, t: Target): boolean {
  const dx = mx - t.x, dy = my - t.y
  return dx * dx + dy * dy <= (t.r * t.scale) ** 2
}

export function makeResult(s: GameState): GameResult {
  return {
    mode: s.mode,
    score: s.score,
    accuracy: s.clicks ? Math.round(s.hits / s.clicks * 100) : (s.trackingTime ? Math.round(s.trackingOnTarget / s.trackingTime * 100) : 100),
    avgTime: s.hits ? Math.round(s.totalTime / s.hits) : 0,
    date: new Date().toISOString(),
  }
}

export function onHit(s: GameState, t: Target) {
  s.hits++
  s.score += 10
  s.totalTime += Date.now() - t.spawnTime
  playHit()
}

export function onMiss() {
  playMiss()
}
