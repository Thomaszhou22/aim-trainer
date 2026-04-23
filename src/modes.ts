import type { GameState } from './engine'
import { createTarget, randomPos, hitTest, onHit, onMiss } from './engine'
import { playHit } from './audio'
import type { GameResult } from './types'

export interface GameModeHandler {
  init(w: number, h: number, s: GameState): void
  update(w: number, h: number, s: GameState): void
  onClick(screenX: number, screenY: number, s: GameState): void
  checkEnd?(s: GameState): GameResult | null
}

// ─── Gridshot ───
export const gridshot: GameModeHandler = {
  init(w, h, s) {
    s.targets = []
    for (let i = 0; i < 3; i++) spawnGridshotTarget(w, h, s)
  },
  update() {},
  onClick(sx, sy, s) {
    s.clicks++
    for (let i = s.targets.length - 1; i >= 0; i--) {
      if (hitTest(sx, sy, s.targets[i])) {
        onHit(s, s.targets[i])
        s.targets.splice(i, 1)
        spawnGridshotTarget(s._worldW || 100, s._worldH || 60, s)
        return
      }
    }
    onMiss()
  },
}

function spawnGridshotTarget(w: number, h: number, s: GameState) {
  const [x, y] = randomPos(w, h, 3)
  s.targets.push(createTarget(x, y, 1.5, '#00ccaa'))
}

// ─── Multiclick ───
export const multiclick: GameModeHandler = {
  init(w, h, s) { s.targets = []; spawnMulticlickTarget(w, h, s) },
  update() {},
  onClick(sx, sy, s) {
    const t = s.targets[0]
    if (!t) return
    s.clicks++
    if (hitTest(sx, sy, t)) {
      playHit()
      t.clicksLeft!--
      t.r = Math.max(0.8, t.r - 0.8)
      if (t.clicksLeft! <= 0) {
        onHit(s, t)
        s.targets.splice(0, 1)
        spawnMulticlickTarget(s._worldW || 100, s._worldH || 60, s)
      }
    } else { onMiss() }
  },
}

function spawnMulticlickTarget(w: number, h: number, s: GameState) {
  const [x, y] = randomPos(w, h, 4)
  const t = createTarget(x, y, 2.8, '#00ccaa')
  t.clicksLeft = 3
  s.targets.push(t)
}

// ─── Sixshot ───
export const sixshot: GameModeHandler = {
  init(w, h, s) { s.targets = []; spawnSixshotGroup(w, h, s) },
  update() {},
  onClick(sx, sy, s) {
    s.clicks++
    for (let i = s.targets.length - 1; i >= 0; i--) {
      if (hitTest(sx, sy, s.targets[i])) {
        onHit(s, s.targets[i])
        s.targets.splice(i, 1)
        if (s.targets.length === 0) spawnSixshotGroup(s._worldW || 100, s._worldH || 60, s)
        return
      }
    }
    onMiss()
  },
}

function spawnSixshotGroup(w: number, h: number, s: GameState) {
  for (let i = 0; i < 6; i++) {
    const [x, y] = randomPos(w, h, 2)
    s.targets.push(createTarget(x, y, 0.8, '#00ccaa'))
  }
}

// ─── Spidershot ───
export const spidershot: GameModeHandler = {
  init(_w, _h, s) { s.targets = []; s.spiderRound = 0; spawnSpiderTargets(s) },
  update() {},
  onClick(sx, sy, s) {
    s.clicks++
    for (let i = s.targets.length - 1; i >= 0; i--) {
      if (hitTest(sx, sy, s.targets[i])) {
        onHit(s, s.targets[i])
        s.targets.splice(i, 1)
        if (s.targets.length === 0) { s.spiderRound++; spawnSpiderTargets(s) }
        return
      }
    }
    onMiss()
  },
}

function spawnSpiderTargets(s: GameState) {
  const rings = Math.min(1 + Math.floor(s.spiderRound / 2), 3)
  const perRing = 3
  for (let ring = 0; ring < rings; ring++) {
    const radius = 4 + ring * 7
    for (let i = 0; i < perRing; i++) {
      const angle = (Math.PI * 2 / perRing) * i + ring * 0.5
      s.targets.push(createTarget(Math.cos(angle) * radius, Math.sin(angle) * radius, 1.2, '#00ccaa'))
    }
  }
}

// ─── Motionshot ───
export const motionshot: GameModeHandler = {
  init(w, h, s) { s.targets = []; spawnMotionTarget(w, h, s) },
  update(w, h, s) {
    s.targets.forEach(t => {
      if (t.vx === undefined) return
      t.x += t.vx!; t.y += t.vy!
      const hw = w / 2, hh = h / 2
      if (t.x - t.r < -hw || t.x + t.r > hw) t.vx = -(t.vx!)
      if (t.y - t.r < -hh || t.y + t.r > hh) t.vy = -(t.vy!)
      t.x = Math.max(-hw + t.r, Math.min(hw - t.r, t.x))
      t.y = Math.max(-hh + t.r, Math.min(hh - t.r, t.y))
    })
  },
  onClick(sx, sy, s) {
    s.clicks++
    for (let i = s.targets.length - 1; i >= 0; i--) {
      if (hitTest(sx, sy, s.targets[i])) {
        onHit(s, s.targets[i])
        s.targets.splice(i, 1)
        spawnMotionTarget(s._worldW || 100, s._worldH || 60, s)
        return
      }
    }
    onMiss()
  },
}

function spawnMotionTarget(w: number, h: number, s: GameState) {
  const [x, y] = randomPos(w, h, 3)
  const t = createTarget(x, y, 1.4, '#00ccaa')
  const speed = 0.15 + Math.random() * 0.2
  const angle = Math.random() * Math.PI * 2
  t.vx = Math.cos(angle) * speed
  t.vy = Math.sin(angle) * speed
  s.targets.push(t)
}

// ─── Microshot ───
export const microshot: GameModeHandler = {
  init(_w, _h, s) { s.targets = []; spawnMicroTarget(s) },
  update() {},
  onClick(sx, sy, s) {
    s.clicks++
    if (s.targets[0] && hitTest(sx, sy, s.targets[0])) {
      onHit(s, s.targets[0])
      s.targets.splice(0, 1)
      spawnMicroTarget(s)
    } else { onMiss() }
  },
}

function spawnMicroTarget(s: GameState) {
  const x = (Math.random() - 0.5) * 12
  const y = (Math.random() - 0.5) * 12
  s.targets.push(createTarget(x, y, 0.6, '#ff9900'))
}

// ─── Multitarget ───
export const multitarget: GameModeHandler = {
  init(w, h, s) { s.targets = []; spawnMultiTargetGroup(w, h, s) },
  update() {},
  onClick(sx, sy, s) {
    s.clicks++
    for (let i = s.targets.length - 1; i >= 0; i--) {
      if (hitTest(sx, sy, s.targets[i])) {
        if (s.targets[i].color === '#00ff88') {
          onHit(s, s.targets[i])
          s.targets.splice(i, 1)
          spawnMultiTargetGroup(s._worldW || 100, s._worldH || 60, s)
        } else {
          playHit()
          s.score = Math.max(0, s.score - 5)
        }
        return
      }
    }
    onMiss()
  },
}

function spawnMultiTargetGroup(w: number, h: number, s: GameState) {
  const count = 5 + Math.floor(Math.random() * 2)
  const correctIdx = Math.floor(Math.random() * count)
  for (let i = 0; i < count; i++) {
    const [x, y] = randomPos(w, h, 3)
    s.targets.push(createTarget(x, y, 1.5, i === correctIdx ? '#00ff88' : '#ff3366'))
  }
}

// ─── Strafetrack ───
export const strafetrack: GameModeHandler = {
  init(_w, _h, s) {
    s.targets = []
    const t = createTarget(0, 0, 1.8, '#aa66ff')
    t.vx = 0.2 * (Math.random() > 0.5 ? 1 : -1)
    t.vy = 0
    s.targets.push(t)
  },
  update(w, _h, s) {
    const t = s.targets[0]
    if (!t || t.vx === undefined) return
    t.x += t.vx
    const hw = w / 2
    if (t.x - t.r < -hw || t.x + t.r > hw) t.vx *= -1
    t.x = Math.max(-hw + t.r, Math.min(hw - t.r, t.x))
    const dx = s.mouseX - t.x, dy = s.mouseY - t.y
    s.trackingTime += 16
    if (dx * dx + dy * dy <= t.r * t.r) s.trackingOnTarget += 16
    s.accuracy = s.trackingTime ? s.trackingOnTarget / s.trackingTime : 0
    s.score = Math.floor(s.accuracy * 100)
  },
  onClick() {},
}

// ─── Circleshoot ───
export const circleshoot: GameModeHandler = {
  init(_w, _h, s) {
    s.targets = []
    const t = createTarget(0, 15, 1.5, '#aa66ff')
    t.orbitCx = 0
    t.orbitCy = 0
    t.orbitRadius = 15
    t.angle = Math.PI / 2
    t.angularV = 0.02
    s.targets.push(t)
  },
  update(_w, _h, s) {
    const t = s.targets[0]
    if (!t || t.angularV === undefined) return
    t.angle = (t.angle ?? 0) + t.angularV!
    t.x = t.orbitCx! + Math.cos(t.angle) * t.orbitRadius!
    t.y = t.orbitCy! + Math.sin(t.angle!) * t.orbitRadius!
    const dx = s.mouseX - t.x, dy = s.mouseY - t.y
    s.trackingTime += 16
    if (dx * dx + dy * dy <= t.r * t.r) s.trackingOnTarget += 16
    s.accuracy = s.trackingTime ? s.trackingOnTarget / s.trackingTime : 0
    s.score = Math.floor(s.accuracy * 100)
  },
  onClick() {},
}

// ─── Reactiveshot ───
export const reactiveshot: GameModeHandler = {
  init(_w, _h, s) {
    s.targets = []
    s.reactionState = 'hidden'
    const t = createTarget(0, 0, 1.5, '#aa66ff')
    t.vx = 0.15 * (Math.random() > 0.5 ? 1 : -1)
    t.vy = 0
    t.visible = false
    s.targets.push(t)
    scheduleReactiveToggle(s)
  },
  update(w, _h, s) {
    const t = s.targets[0]
    if (!t) return
    if (s.reactionState === 'visible' && t.vx !== undefined) {
      t.visible = true
      t.x += t.vx
      const hw = w / 2
      if (t.x - t.r < -hw || t.x + t.r > hw) t.vx *= -1
      t.x = Math.max(-hw + t.r, Math.min(hw - t.r, t.x))
      const dx = s.mouseX - t.x, dy = s.mouseY - t.y
      s.trackingTime += 16
      if (dx * dx + dy * dy <= t.r * t.r) s.trackingOnTarget += 16
      s.accuracy = s.trackingTime ? s.trackingOnTarget / s.trackingTime : 0
      s.score = Math.floor(s.accuracy * 100)
    } else {
      t.visible = false
    }
  },
  onClick() {},
}

function scheduleReactiveToggle(s: GameState) {
  const show = () => {
    if (!s.running) return
    s.reactionState = 'visible'
    s.targets.forEach(t => { t.scale = 0; t.visible = true })
    const t = s.targets[0]
    if (t) t.spawnTime = Date.now()
    s._spawnTimer = setTimeout(hide, 1500 + Math.random() * 2000)
  }
  const hide = () => {
    if (!s.running) return
    s.reactionState = 'hidden'
    s._spawnTimer = setTimeout(show, 500 + Math.random() * 1500)
  }
  s._spawnTimer = setTimeout(show, 500 + Math.random() * 1000)
}

// ─── Reaction Time ───
export const reaction: GameModeHandler = {
  init(_w, _h, s) {
    s.reactionRound = 0
    s.reactionTimes = []
    s.reactionState = 'waiting'
    scheduleReactionColor(s)
  },
  update() {},
  onClick(_sx, _sy, s) {
    if (s.reactionState === 'ready') {
      s.reactionTimes.push(Date.now() - s.reactionColorTime)
      s.reactionState = 'clicked'
      playHit()
      setTimeout(() => {
        if (s.running) { s.reactionRound++; s.reactionState = 'waiting'; scheduleReactionColor(s) }
      }, 800)
    } else if (s.reactionState === 'waiting') {
      playHit()
    }
  },
  checkEnd(s): GameResult | null {
    if (s.reactionRound >= 5 && s.reactionState === 'clicked') {
      const avg = s.reactionTimes.reduce((a, b) => a + b, 0) / s.reactionTimes.length
      return { mode: 'reaction', score: Math.max(0, 1000 - Math.round(avg)), accuracy: 100, avgTime: Math.round(avg), date: new Date().toISOString() }
    }
    return null
  },
}

function scheduleReactionColor(s: GameState) {
  s._reactionTimer = setTimeout(() => {
    if (s.running && s.reactionState === 'waiting') {
      s.reactionState = 'ready'
      s.reactionColorTime = Date.now()
    }
  }, 1000 + Math.random() * 3000)
}

// ─── Detection ───
export const detection: GameModeHandler = {
  init(w, h, s) { s.targets = []; s.detectionRound = 0; spawnDetectionGroup(w, h, s) },
  update() {},
  onClick(sx, sy, s) {
    s.clicks++
    for (let i = s.targets.length - 1; i >= 0; i--) {
      if (hitTest(sx, sy, s.targets[i])) {
        if (s.targets[i].color === '#ff3366') {
          s.hits++
          s.reactionTimes.push(Date.now() - s.targets[i].spawnTime)
          playHit()
          s.detectionRound++
          s.targets.splice(i, 1)
          if (s.detectionRound >= 10) return
          spawnDetectionGroup(s._worldW || 100, s._worldH || 60, s)
        } else { onMiss() }
        return
      }
    }
    onMiss()
  },
  checkEnd(s): GameResult | null {
    if (s.detectionRound >= 10) {
      const avg = s.reactionTimes.length ? s.reactionTimes.reduce((a, b) => a + b, 0) / s.reactionTimes.length : 0
      const acc = s.clicks ? Math.round(s.hits / s.clicks * 100) : 0
      return { mode: 'detection', score: acc * 10, accuracy: acc, avgTime: Math.round(avg), date: new Date().toISOString() }
    }
    return null
  },
}

function spawnDetectionGroup(w: number, h: number, s: GameState) {
  const count = 4 + Math.floor(Math.random() * 4)
  const correctIdx = Math.floor(Math.random() * count)
  for (let i = 0; i < count; i++) {
    const [x, y] = randomPos(w, h, 3)
    s.targets.push(createTarget(x, y, 1.3, i === correctIdx ? '#ff3366' : '#00ccaa'))
  }
}

// ─── Scattershot ───
export const scattershot: GameModeHandler = {
  init(w, h, s) { s.targets = []; spawnScatterTarget(w, h, s) },
  update(w, h, s) {
    const now = Date.now()
    for (let i = s.targets.length - 1; i >= 0; i--) {
      const t = s.targets[i]
      if (t.lifetime && now - t.spawnTime > t.lifetime) {
        s.targets.splice(i, 1)
        spawnScatterTarget(w, h, s)
      }
    }
  },
  onClick(sx, sy, s) {
    s.clicks++
    for (let i = s.targets.length - 1; i >= 0; i--) {
      if (hitTest(sx, sy, s.targets[i])) {
        onHit(s, s.targets[i])
        s.targets.splice(i, 1)
        spawnScatterTarget(s._worldW || 100, s._worldH || 60, s)
        return
      }
    }
    onMiss()
  },
}

function spawnScatterTarget(w: number, h: number, s: GameState) {
  const [x, y] = randomPos(w, h, 3)
  const t = createTarget(x, y, 1.3, '#ff3366')
  t.lifetime = 800
  s.targets.push(t)
}

// ─── Handler map ───
export const HANDLERS: Record<string, GameModeHandler> = {
  gridshot, multiclick, sixshot, spidershot, motionshot,
  microshot, multitarget,
  strafetrack, circleshoot, reactiveshot,
  reaction, detection,
  scattershot,
}
