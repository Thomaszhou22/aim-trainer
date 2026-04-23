import type { GameState } from './engine'
import { createTarget, randomPos, hitTest, onHit, onMiss, drawTarget, drawCrosshair, drawHUD } from './engine'
import { playHit } from './audio'
import type { GameResult } from './types'
import { MODES } from './types'
import type { GameModeHandler } from './App'

// ─── Gridshot ───
export const gridshot: GameModeHandler = {
  init(w, h, s) {
    s.targets = []
    for (let i = 0; i < 3; i++) spawnGridshotTarget(w, h, s)
  },
  update(_w, _h, _s) {},
  onClick(w, h, s, x, y) {
    s.clicks++
    for (let i = s.targets.length - 1; i >= 0; i--) {
      if (hitTest(x, y, s.targets[i])) {
        onHit(s, s.targets[i])
        s.targets.splice(i, 1)
        spawnGridshotTarget(w, h, s)
        return
      }
    }
    onMiss()
  },
  draw(ctx, w, h, s) {
    s.targets.forEach(t => drawTarget(ctx, t))
    drawCrosshair(ctx, s.mouseX, s.mouseY)
    const def = MODES.find(m => m.id === 'gridshot')!
    drawHUD(ctx, w, h, s, def.name)
  },
}

function spawnGridshotTarget(w: number, h: number, s: GameState) {
  const [x, y] = randomPos(w, h, 60)
  s.targets.push(createTarget(x, y, 28, '#00aaff'))
}

// ─── Multiclick ───
export const multiclick: GameModeHandler = {
  init(w, h, s) {
    s.targets = []
    spawnMulticlickTarget(w, h, s)
  },
  update() {},
  onClick(w, h, s, x, y) {
    const t = s.targets[0]
    if (!t) return
    s.clicks++
    if (hitTest(x, y, t)) {
      playHit()
      t.clicksLeft!--
      t.r = Math.max(10, t.r - 15)
      if (t.clicksLeft! <= 0) {
        onHit(s, t)
        s.targets.splice(0, 1)
        spawnMulticlickTarget(w, h, s)
      }
    } else {
      onMiss()
    }
  },
  draw(ctx, w, h, s) {
    s.targets.forEach(t => {
      drawTarget(ctx, t)
      if (t.clicksLeft && t.clicksLeft > 1) {
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 16px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(String(t.clicksLeft), t.x, t.y + 5)
      }
    })
    drawCrosshair(ctx, s.mouseX, s.mouseY)
    const def = MODES.find(m => m.id === 'multiclick')!
    drawHUD(ctx, w, h, s, def.name)
  },
}

function spawnMulticlickTarget(w: number, h: number, s: GameState) {
  const [x, y] = randomPos(w, h, 80)
  const t = createTarget(x, y, 55, '#00aaff')
  t.clicksLeft = 3
  s.targets.push(t)
}

// ─── Sixshot ───
export const sixshot: GameModeHandler = {
  init(w, h, s) {
    s.targets = []
    spawnSixshotGroup(w, h, s)
  },
  update() {},
  onClick(w, h, s, x, y) {
    s.clicks++
    for (let i = s.targets.length - 1; i >= 0; i--) {
      if (hitTest(x, y, s.targets[i])) {
        onHit(s, s.targets[i])
        s.targets.splice(i, 1)
        if (s.targets.length === 0) spawnSixshotGroup(w, h, s)
        return
      }
    }
    onMiss()
  },
  draw(ctx, w, h, s) {
    s.targets.forEach(t => drawTarget(ctx, t))
    drawCrosshair(ctx, s.mouseX, s.mouseY)
    const def = MODES.find(m => m.id === 'sixshot')!
    drawHUD(ctx, w, h, s, def.name)
  },
}

function spawnSixshotGroup(w: number, h: number, s: GameState) {
  for (let i = 0; i < 6; i++) {
    const [x, y] = randomPos(w, h, 30)
    s.targets.push(createTarget(x, y, 14, '#00aaff'))
  }
}

// ─── Spidershot ───
export const spidershot: GameModeHandler = {
  init(w, h, s) {
    s.targets = []
    s.spiderRound = 0
    spawnSpiderTargets(w, h, s)
  },
  update() {},
  onClick(w, h, s, x, y) {
    s.clicks++
    for (let i = s.targets.length - 1; i >= 0; i--) {
      if (hitTest(x, y, s.targets[i])) {
        onHit(s, s.targets[i])
        s.targets.splice(i, 1)
        if (s.targets.length === 0) {
          s.spiderRound++
          spawnSpiderTargets(w, h, s)
        }
        return
      }
    }
    onMiss()
  },
  draw(ctx, w, h, s) {
    s.targets.forEach(t => drawTarget(ctx, t))
    drawCrosshair(ctx, s.mouseX, s.mouseY)
    const def = MODES.find(m => m.id === 'spidershot')!
    drawHUD(ctx, w, h, s, def.name)
  },
}

function spawnSpiderTargets(w: number, h: number, s: GameState) {
  const cx = w / 2, cy = h / 2
  const rings = Math.min(1 + Math.floor(s.spiderRound / 2), 3)
  const targetsPerRing = 3
  for (let ring = 0; ring < rings; ring++) {
    const radius = 80 + ring * 120
    for (let i = 0; i < targetsPerRing; i++) {
      const angle = (Math.PI * 2 / targetsPerRing) * i + ring * 0.5
      const x = cx + Math.cos(angle) * radius
      const y = cy + Math.sin(angle) * radius
      const margin = 25
      if (x > margin && x < w - margin && y > margin && y < h - margin) {
        s.targets.push(createTarget(x, y, 22, '#00aaff'))
      }
    }
  }
  // If no targets spawned (edge case), spawn center target
  if (s.targets.length === 0) {
    s.targets.push(createTarget(cx, cy, 25, '#00aaff'))
  }
}

// ─── Motionshot ───
export const motionshot: GameModeHandler = {
  init(w, h, s) {
    s.targets = []
    spawnMotionTarget(w, h, s)
  },
  update(w, h, s) {
    s.targets.forEach(t => {
      if (t.vx === undefined) return
      t.x += t.vx!; t.y += t.vy!
      if (t.x - t.r < 0 || t.x + t.r > w) t.vx = -(t.vx!)
      if (t.y - t.r < 0 || t.y + t.r > h) t.vy = -(t.vy!)
      t.x = Math.max(t.r, Math.min(w - t.r, t.x))
      t.y = Math.max(t.r, Math.min(h - t.r, t.y))
    })
  },
  onClick(w, h, s, x, y) {
    s.clicks++
    for (let i = s.targets.length - 1; i >= 0; i--) {
      if (hitTest(x, y, s.targets[i])) {
        onHit(s, s.targets[i])
        s.targets.splice(i, 1)
        spawnMotionTarget(w, h, s)
        return
      }
    }
    onMiss()
  },
  draw(ctx, w, h, s) {
    s.targets.forEach(t => drawTarget(ctx, t))
    drawCrosshair(ctx, s.mouseX, s.mouseY)
    const def = MODES.find(m => m.id === 'motionshot')!
    drawHUD(ctx, w, h, s, def.name)
  },
}

function spawnMotionTarget(w: number, h: number, s: GameState) {
  const t = createTarget(0, 0, 26, '#00aaff')
  t.x = 80 + Math.random() * (w - 160)
  t.y = 80 + Math.random() * (h - 160)
  const speed = 2 + Math.random() * 3
  const angle = Math.random() * Math.PI * 2
  t.vx = Math.cos(angle) * speed
  t.vy = Math.sin(angle) * speed
  s.targets.push(t)
}

// ─── Microshot ───
export const microshot: GameModeHandler = {
  init(w, h, s) {
    s.targets = []
    spawnMicroTarget(w, h, s)
  },
  update() {},
  onClick(w, _h, s, x, y) {
    s.clicks++
    if (s.targets[0] && hitTest(x, y, s.targets[0])) {
      onHit(s, s.targets[0])
      s.targets.splice(0, 1)
      spawnMicroTarget(w, _h, s)
    } else {
      onMiss()
    }
  },
  draw(ctx, w, h, s) {
    s.targets.forEach(t => drawTarget(ctx, t))
    drawCrosshair(ctx, s.mouseX, s.mouseY)
    const def = MODES.find(m => m.id === 'microshot')!
    drawHUD(ctx, w, h, s, def.name)
  },
}

function spawnMicroTarget(w: number, h: number, s: GameState) {
  const cx = w / 2, cy = h / 2
  const x = cx + (Math.random() - 0.5) * 200
  const y = cy + (Math.random() - 0.5) * 200
  s.targets.push(createTarget(x, y, 10, '#ff9900'))
}

// ─── Multitarget ───
export const multitarget: GameModeHandler = {
  init(w, h, s) {
    s.targets = []
    spawnMultiTargetGroup(w, h, s)
  },
  update() {},
  onClick(w, h, s, x, y) {
    s.clicks++
    for (let i = s.targets.length - 1; i >= 0; i--) {
      if (hitTest(x, y, s.targets[i])) {
        if (s.targets[i].color === '#00ff88') {
          onHit(s, s.targets[i])
          s.targets.splice(i, 1)
          spawnMultiTargetGroup(w, h, s)
        } else {
          // Wrong target
          playHit()
          s.score = Math.max(0, s.score - 5)
        }
        return
      }
    }
    onMiss()
  },
  draw(ctx, w, h, s) {
    s.targets.forEach(t => drawTarget(ctx, t))
    drawCrosshair(ctx, s.mouseX, s.mouseY)
    const def = MODES.find(m => m.id === 'multitarget')!
    drawHUD(ctx, w, h, s, def.name)
  },
}

function spawnMultiTargetGroup(w: number, h: number, s: GameState) {
  const count = 5 + Math.floor(Math.random() * 2)
  const correctIdx = Math.floor(Math.random() * count)
  for (let i = 0; i < count; i++) {
    const [x, y] = randomPos(w, h, 50)
    const t = createTarget(x, y, 28, i === correctIdx ? '#00ff88' : '#ff3366')
    s.targets.push(t)
  }
}

// ─── Strafetrack ───
export const strafetrack: GameModeHandler = {
  init(w, h, s) {
    s.targets = []
    const t = createTarget(w / 2, h / 2, 35, '#aa66ff')
    t.vx = 3 * (Math.random() > 0.5 ? 1 : -1)
    t.vy = 0
    s.targets.push(t)
  },
  update(w, _h, s) {
    const t = s.targets[0]
    if (!t || t.vx === undefined) return
    t.x += t.vx
    if (t.x - t.r < 0 || t.x + t.r > w) t.vx *= -1
    t.x = Math.max(t.r, Math.min(w - t.r, t.x))
    const dx = s.mouseX - t.x, dy = s.mouseY - t.y
    s.trackingTime += 16
    if (dx * dx + dy * dy <= t.r * t.r) s.trackingOnTarget += 16
    s.accuracy = s.trackingTime ? s.trackingOnTarget / s.trackingTime : 0
    s.score = Math.floor(s.accuracy * 100)
  },
  onClick() {},
  draw(ctx, w, h, s) {
    s.targets.forEach(t => drawTarget(ctx, t))
    drawCrosshair(ctx, s.mouseX, s.mouseY)
    const def = MODES.find(m => m.id === 'strafetrack')!
    // Custom HUD for tracking
    const elapsed = (Date.now() - s.startTime) / 1000
    const timeLeft = Math.max(0, s.duration - elapsed)
    ctx.fillStyle = '#ffffff33'
    ctx.font = 'bold 18px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(def.name, w / 2, 35)
    ctx.fillStyle = timeLeft < 5 ? '#ff3366' : '#ffffff'
    ctx.font = 'bold 22px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`${timeLeft.toFixed(1)}s`, 20, 40)
    ctx.fillStyle = '#00ff88'
    ctx.textAlign = 'right'
    ctx.fillText(`${(s.accuracy * 100).toFixed(1)}%`, w - 20, 40)
    ctx.fillStyle = '#ffffff33'
    ctx.font = '13px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('ESC 返回', w / 2, h - 20)
  },
}

// ─── Circleshoot ───
export const circleshoot: GameModeHandler = {
  init(w, h, s) {
    s.targets = []
    const t = createTarget(w / 2, h / 2 + 150, 30, '#aa66ff')
    t.orbitCx = w / 2
    t.orbitCy = h / 2
    t.orbitRadius = Math.min(w, h) * 0.25
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
  draw(ctx, w, h, s) {
    // Draw orbit path
    const t = s.targets[0]
    if (t?.orbitCx !== undefined) {
      ctx.strokeStyle = '#ffffff11'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(t.orbitCx!, t.orbitCy!, t.orbitRadius!, 0, Math.PI * 2)
      ctx.stroke()
    }
    s.targets.forEach(t2 => drawTarget(ctx, t2))
    drawCrosshair(ctx, s.mouseX, s.mouseY)
    // Custom HUD same as strafetrack
    const elapsed = (Date.now() - s.startTime) / 1000
    const timeLeft = Math.max(0, s.duration - elapsed)
    ctx.fillStyle = '#ffffff33'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center'
    ctx.fillText('Circleshoot', w / 2, 35)
    ctx.fillStyle = timeLeft < 5 ? '#ff3366' : '#ffffff'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'left'
    ctx.fillText(`${timeLeft.toFixed(1)}s`, 20, 40)
    ctx.fillStyle = '#00ff88'; ctx.textAlign = 'right'
    ctx.fillText(`${(s.accuracy * 100).toFixed(1)}%`, w - 20, 40)
    ctx.fillStyle = '#ffffff33'; ctx.font = '13px monospace'; ctx.textAlign = 'center'
    ctx.fillText('ESC 返回', w / 2, h - 20)
  },
}

// ─── Reactiveshot ───
export const reactiveshot: GameModeHandler = {
  init(w, h, s) {
    s.targets = []
    s.reactionState = 'hidden'
    const t = createTarget(w / 2, h / 2, 30, '#aa66ff')
    t.vx = 2 * (Math.random() > 0.5 ? 1 : -1)
    t.vy = 0
    s.targets.push(t)
    scheduleReactiveToggle(s)
  },
  update(w, _h, s) {
    const t = s.targets[0]
    if (!t) return
    if (s.reactionState === 'visible' && t.vx !== undefined) {
      t.x += t.vx
      if (t.x - t.r < 0 || t.x + t.r > w) t.vx *= -1
      t.x = Math.max(t.r, Math.min(w - t.r, t.x))
      const dx = s.mouseX - t.x, dy = s.mouseY - t.y
      s.trackingTime += 16
      if (dx * dx + dy * dy <= t.r * t.r) s.trackingOnTarget += 16
      s.accuracy = s.trackingTime ? s.trackingOnTarget / s.trackingTime : 0
      s.score = Math.floor(s.accuracy * 100)
    }
  },
  onClick() {},
  draw(ctx, w, h, s) {
    if (s.reactionState === 'visible') {
      s.targets.forEach(t => drawTarget(ctx, t))
    } else {
      const t = s.targets[0]
      if (t) {
        ctx.fillStyle = '#ffffff11'
        ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#ffffff33'; ctx.font = '14px monospace'; ctx.textAlign = 'center'
        ctx.fillText('等待...', t.x, t.y + 4)
      }
    }
    drawCrosshair(ctx, s.mouseX, s.mouseY)
    const elapsed = (Date.now() - s.startTime) / 1000
    const timeLeft = Math.max(0, s.duration - elapsed)
    ctx.fillStyle = '#ffffff33'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center'
    ctx.fillText('Reactiveshot', w / 2, 35)
    ctx.fillStyle = timeLeft < 5 ? '#ff3366' : '#ffffff'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'left'
    ctx.fillText(`${timeLeft.toFixed(1)}s`, 20, 40)
    ctx.fillStyle = s.reactionState === 'visible' ? '#00ff88' : '#ff3366'; ctx.textAlign = 'right'
    ctx.font = 'bold 16px monospace'
    ctx.fillText(s.reactionState === 'visible' ? '跟踪中!' : '隐藏', w - 20, 40)
    ctx.fillStyle = '#ffffff33'; ctx.font = '13px monospace'; ctx.textAlign = 'center'
    ctx.fillText('ESC 返回', w / 2, h - 20)
  },
}

function scheduleReactiveToggle(s: GameState) {
  const show = () => {
    if (!s.running) return
    s.reactionState = 'visible'
    s.targets.forEach(t => t.scale = 0)
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
  onClick(_w, _h, s, _x, _y) {
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
  draw(ctx, w, h, s) {
    if (s.reactionState === 'waiting') {
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#666'; ctx.font = 'bold 32px monospace'; ctx.textAlign = 'center'
      ctx.fillText('等待变色...', w / 2, h / 2)
    } else if (s.reactionState === 'ready') {
      ctx.fillStyle = '#00ff88'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#000'; ctx.font = 'bold 48px monospace'; ctx.textAlign = 'center'
      ctx.fillText('点击！', w / 2, h / 2)
    } else if (s.reactionState === 'clicked') {
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#00ff88'; ctx.font = 'bold 36px monospace'; ctx.textAlign = 'center'
      ctx.fillText(`${s.reactionTimes[s.reactionTimes.length - 1]}ms`, w / 2, h / 2)
    }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'left'
    ctx.fillText(`${Math.min(s.reactionRound + 1, 5)}/5`, 20, 40)
    drawCrosshair(ctx, s.mouseX, s.mouseY)
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
  init(w, h, s) {
    s.targets = []
    s.detectionRound = 0
    spawnDetectionGroup(w, h, s)
  },
  update() {},
  onClick(w, h, s, x, y) {
    s.clicks++
    for (let i = s.targets.length - 1; i >= 0; i--) {
      if (hitTest(x, y, s.targets[i])) {
        if (s.targets[i].color === '#ff3366') {
          s.hits++
          s.reactionTimes.push(Date.now() - s.targets[i].spawnTime)
          playHit()
          s.detectionRound++
          s.targets.splice(i, 1)
          if (s.detectionRound >= 10) return // end
          spawnDetectionGroup(w, h, s)
        } else {
          onMiss()
        }
        return
      }
    }
    onMiss()
  },
  draw(ctx, w, h, s) {
    s.targets.forEach(t => drawTarget(ctx, t))
    drawCrosshair(ctx, s.mouseX, s.mouseY)
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'left'
    ctx.fillText(`${Math.min(s.detectionRound + 1, 10)}/10`, 20, 40)
    ctx.fillStyle = '#ffffff33'; ctx.font = '13px monospace'; ctx.textAlign = 'center'
    ctx.fillText('ESC 返回', w / 2, h - 20)
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
    const [x, y] = randomPos(w, h, 40)
    s.targets.push(createTarget(x, y, 24, i === correctIdx ? '#ff3366' : '#00aaff'))
  }
}

// ─── Scattershot ───
export const scattershot: GameModeHandler = {
  init(w, h, s) {
    s.targets = []
    spawnScatterTarget(w, h, s)
  },
  update(w, _h, s) {
    const now = Date.now()
    for (let i = s.targets.length - 1; i >= 0; i--) {
      const t = s.targets[i]
      if (t.lifetime && now - t.spawnTime > t.lifetime) {
        s.targets.splice(i, 1)
        spawnScatterTarget(w, w, s) // w used as placeholder
      }
    }
  },
  onClick(w, h, s, x, y) {
    s.clicks++
    for (let i = s.targets.length - 1; i >= 0; i--) {
      if (hitTest(x, y, s.targets[i])) {
        onHit(s, s.targets[i])
        s.targets.splice(i, 1)
        spawnScatterTarget(w, h, s)
        return
      }
    }
    onMiss()
  },
  draw(ctx, w, h, s) {
    s.targets.forEach(t => {
      // Draw fade-out indicator
      if (t.lifetime) {
        const elapsed = Date.now() - t.spawnTime
        const remaining = 1 - elapsed / t.lifetime
        if (remaining < 0.3) {
          ctx.strokeStyle = '#ff336666'
          ctx.lineWidth = 2
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r * t.scale + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remaining); ctx.stroke()
        }
      }
      drawTarget(ctx, t)
    })
    drawCrosshair(ctx, s.mouseX, s.mouseY)
    const def = MODES.find(m => m.id === 'scattershot')!
    drawHUD(ctx, w, h, s, def.name)
  },
}

function spawnScatterTarget(w: number, _h: number, s: GameState) {
  const [x, y] = randomPos(w, w, 50)
  const t = createTarget(x, y, 25, '#ff3366')
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
