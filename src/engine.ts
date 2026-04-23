// Shared game logic (no rendering)
import type { GameResult } from './types'
import { playHit, playMiss } from './audio'
import { hitTestTarget, spawnParticles } from './targets'

export interface Target {
  id: number
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
  visible?: boolean
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
  mouseX: number // world coords
  mouseY: number // world coords
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
  _spawnTimer?: ReturnType<typeof setTimeout>
  _nextSpawnTime?: number
  _worldW?: number
  _worldH?: number
}

let _nextTargetId = 0

export function createTarget(x: number, y: number, r: number, color = '#00ccff'): Target {
  return { id: _nextTargetId++, x, y, r, spawnTime: Date.now(), scale: 0, color }
}

/** World-space random position. w/h = total visible dimensions, margin in world units. */
export function randomPos(w: number, h: number, margin: number): [number, number] {
  return [
    -w / 2 + margin + Math.random() * (w - 2 * margin),
    -h / 2 + margin + Math.random() * (h - 2 * margin),
  ]
}

/** Raycaster-based hit test. sx/sy are screen coordinates. */
export function hitTest(sx: number, sy: number, t: Target): boolean {
  return hitTestTarget(sx, sy, t)
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
  spawnParticles(t.x, t.y, t.color || '#00aaff')
}

export function onMiss() {
  playMiss()
}
