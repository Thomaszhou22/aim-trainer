import { useState, useRef, useEffect, useCallback } from 'react'

type GameMode = 'menu' | 'flick' | 'tracking' | 'reaction' | 'result'
type TargetSize = 'small' | 'medium' | 'large'

interface GameResult {
  mode: string
  score: number
  accuracy: number
  avgTime: number
  date: string
}

function playBeep(freq = 800, dur = 50) {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain).connect(ctx.destination)
    osc.frequency.value = freq
    gain.gain.value = 0.1
    osc.start()
    osc.stop(ctx.currentTime + dur / 1000)
  } catch {}
}

const SIZES: Record<TargetSize, number> = { small: 20, medium: 35, large: 50 }

function getHistory(): GameResult[] {
  try { return JSON.parse(localStorage.getItem('aim-history') || '[]') } catch { return [] }
}
function saveHistory(r: GameResult) {
  const h = getHistory()
  h.push(r)
  localStorage.setItem('aim-history', JSON.stringify(h.slice(-50)))
}
function getBest(mode: string): GameResult | null {
  const h = getHistory().filter(r => r.mode === mode)
  return h.length ? h.reduce((a, b) => b.score > a.score ? b : a) : null
}

export default function App() {
  const [mode, setMode] = useState<GameMode>('menu')
  const [targetSize, setTargetSize] = useState<TargetSize>('medium')
  const [result, setResult] = useState<GameResult | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<any>({})
  const rafRef = useRef(0)

  const stopGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const s = stateRef.current
    if (s.running && s.startTime) {
      const elapsed = (Date.now() - s.startTime) / 1000
      if (elapsed >= s.duration) {
        const r: GameResult = {
          mode: s.mode, score: s.score, accuracy: s.hits && s.clicks ? s.hits / s.clicks : 0,
          avgTime: s.totalTime && s.hits ? s.totalTime / s.hits : 0,
          date: new Date().toISOString()
        }
        setResult(r); saveHistory(r); setMode('result')
      }
    }
    s.running = false
  }, [])

  const startGame = useCallback((m: 'flick' | 'tracking' | 'reaction') => {
    setResult(null)
    setMode(m)
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const s = stateRef.current
    Object.assign(s, {
      running: true, mode: m, score: 0, hits: 0, clicks: 0, totalTime: 0,
      startTime: Date.now(), duration: m === 'tracking' ? 20 : m === 'reaction' ? 0 : 30,
      target: null, mouseX: canvas.width / 2, mouseY: canvas.height / 2,
      reactionRound: 0, reactionMaxRounds: 5, reactionTimes: [],
      reactionState: 'waiting', // waiting -> ready -> clicked
      reactionColorTime: 0, trackingTime: 0, trackingOnTarget: 0,
      targetScale: 0, targetVisible: true,
    })

    if (m === 'flick') spawnTarget(canvas, s, targetSize)
    if (m === 'tracking') spawnMovingTarget(canvas, s)

    const onMouse = (e: MouseEvent) => { s.mouseX = e.clientX; s.mouseY = e.clientY }
    const onClick = (e: MouseEvent) => {
      if (!s.running) return
      const x = e.clientX, y = e.clientY
      if (m === 'flick') {
        s.clicks++
        const t = s.target
        if (t) {
          const dx = x - t.x, dy = y - t.y
          if (dx * dx + dy * dy <= t.r * t.r) {
            s.hits++; s.score += 10
            const now = Date.now()
            if (t.spawnTime) s.totalTime += now - t.spawnTime
            playBeep(1000, 30)
            spawnTarget(canvas, s, targetSize)
          } else {
            playBeep(300, 80)
          }
        }
      } else if (m === 'reaction') {
        if (s.reactionState === 'ready') {
          s.reactionTimes.push(Date.now() - s.reactionColorTime)
          s.reactionState = 'clicked'
          playBeep(1200, 30)
          setTimeout(() => {
            if (s.running) { s.reactionRound++; s.reactionState = 'waiting' }
          }, 800)
        } else if (s.reactionState === 'waiting') {
          // too early - reset
          playBeep(200, 100)
        }
      }
    }

    canvas.addEventListener('mousemove', onMouse)
    canvas.addEventListener('click', onClick)
    stateRef.current._cleanup = () => {
      canvas.removeEventListener('mousemove', onMouse)
      canvas.removeEventListener('click', onClick)
    }

    const draw = () => {
      if (!s.running) return
      const w = canvas.width, h = canvas.height
      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, w, h)

      // Grid lines
      ctx.strokeStyle = '#111118'
      ctx.lineWidth = 1
      for (let x = 0; x < w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
      for (let y = 0; y < h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }

      const elapsed = (Date.now() - s.startTime) / 1000

      // Update tracking
      if (m === 'tracking') {
        const t = s.target
        if (t) {
          t.x += t.vx; t.y += t.vy
          if (t.x - t.r < 0 || t.x + t.r > w) t.vx *= -1
          if (t.y - t.r < 0 || t.y + t.r > h) t.vy *= -1
          t.x = Math.max(t.r, Math.min(w - t.r, t.x))
          t.y = Math.max(t.r, Math.min(h - t.r, t.y))
          // Check if mouse on target
          const dx = s.mouseX - t.x, dy = s.mouseY - t.y
          s.trackingOnTarget = (dx * dx + dy * dy <= t.r * t.r) ? s.trackingOnTarget + 16 : s.trackingOnTarget
          s.trackingTime += 16
          s.accuracy = s.trackingTime ? s.trackingOnTarget / s.trackingTime : 0
          s.score = Math.floor(s.accuracy * 100)
        }
      }

      // Reaction mode
      if (m === 'reaction') {
        if (s.reactionState === 'waiting') {
          // Random delay before color change
          if (!s._reactionTimer) {
            s._reactionTimer = setTimeout(() => {
              if (s.running && s.reactionState === 'waiting') {
                s.reactionState = 'ready'
                s.reactionColorTime = Date.now()
              }
            }, 1000 + Math.random() * 3000)
          }
          ctx.fillStyle = '#1a1a2e'
          ctx.fillRect(0, 0, w, h)
          ctx.fillStyle = '#666'
          ctx.font = 'bold 32px monospace'
          ctx.textAlign = 'center'
          ctx.fillText('等待变色...', w / 2, h / 2)
        } else if (s.reactionState === 'ready') {
          ctx.fillStyle = '#00ff88'
          ctx.fillRect(0, 0, w, h)
          ctx.fillStyle = '#000'
          ctx.font = 'bold 48px monospace'
          ctx.textAlign = 'center'
          ctx.fillText('点击！', w / 2, h / 2)
        } else if (s.reactionState === 'clicked') {
          ctx.fillStyle = '#1a1a2e'
          ctx.fillRect(0, 0, w, h)
          ctx.fillStyle = '#00ff88'
          ctx.font = 'bold 28px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(`${s.reactionTimes[s.reactionTimes.length - 1]}ms`, w / 2, h / 2)
        }
        // Check round end
        if (s.reactionRound >= s.reactionMaxRounds && s.reactionState === 'clicked') {
          s.running = false
          const avg = s.reactionTimes.reduce((a: number, b: number) => a + b, 0) / s.reactionTimes.length
          const r: GameResult = { mode: 'reaction', score: Math.max(0, 1000 - Math.round(avg)), accuracy: 100, avgTime: Math.round(avg), date: new Date().toISOString() }
          setResult(r); saveHistory(r); setMode('result')
          return
        }
      }

      // Draw target for flick/tracking
      if (m === 'flick' || m === 'tracking') {
        const t = s.target
        if (t) {
          if (t._scale === undefined) t._scale = 0
          t._scale = Math.min(1, t._scale + 0.08)
          const scale = t._scale
          const r = t.r * scale

          // Glow
          const grad = ctx.createRadialGradient(t.x, t.y, r * 0.5, t.x, t.y, r * 1.5)
          grad.addColorStop(0, 'rgba(0,255,136,0.15)')
          grad.addColorStop(1, 'rgba(0,255,136,0)')
          ctx.fillStyle = grad
          ctx.beginPath(); ctx.arc(t.x, t.y, r * 1.5, 0, Math.PI * 2); ctx.fill()

          // Target circle
          ctx.fillStyle = m === 'tracking' ? 'rgba(0,204,255,0.8)' : '#00ff88'
          ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#0a0a0f'
          ctx.beginPath(); ctx.arc(t.x, t.y, r * 0.5, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = m === 'tracking' ? '#00ccff' : '#00ff88'
          ctx.beginPath(); ctx.arc(t.x, t.y, r * 0.2, 0, Math.PI * 2); ctx.fill()
        }
      }

      // Draw crosshair
      const cx = s.mouseX, cy = s.mouseY
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(cx - 15, cy); ctx.lineTo(cx - 5, cy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx + 5, cy); ctx.lineTo(cx + 15, cy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy - 5); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx, cy + 5); ctx.lineTo(cx, cy + 15); ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.stroke()

      // HUD
      if (m !== 'reaction') {
        const timeLeft = Math.max(0, s.duration - elapsed)
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 20px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(`⏱ ${timeLeft.toFixed(1)}s`, 20, 40)
        ctx.fillText(`🎯 ${s.score}`, 20, 70)
        if (m === 'flick') ctx.fillText(`准确率: ${s.clicks ? Math.round(s.hits / s.clicks * 100) : 0}%`, 20, 100)
        if (m === 'tracking') ctx.fillText(`跟踪率: ${(s.accuracy * 100).toFixed(1)}%`, 20, 100)
        ctx.textAlign = 'right'
        ctx.fillStyle = '#888'
        ctx.font = '14px monospace'
        ctx.fillText('ESC 返回', w - 20, 30)
      } else {
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 20px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(`轮次: ${Math.min(s.reactionRound + 1, s.reactionMaxRounds)}/${s.reactionMaxRounds}`, 20, 40)
      }

      // Time up check
      if (m !== 'reaction' && elapsed >= s.duration) {
        s.running = false
        const r: GameResult = {
          mode: m, score: s.score,
          accuracy: m === 'tracking' ? +(s.accuracy * 100).toFixed(1) : (s.clicks ? Math.round(s.hits / s.clicks * 100) : 0),
          avgTime: s.hits ? Math.round(s.totalTime / s.hits) : 0,
          date: new Date().toISOString()
        }
        setResult(r); saveHistory(r); setMode('result')
        return
      }

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
  }, [targetSize, stopGame])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stateRef.current.running) {
        stateRef.current.running = false
        cancelAnimationFrame(rafRef.current)
        stateRef.current._cleanup?.()
        setMode('menu')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      cancelAnimationFrame(rafRef.current)
      stateRef.current._cleanup?.()
    }
  }, [])

  // Menu
  if (mode === 'menu') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#0a0a0f' }}>
        <h1 className="text-5xl font-bold mb-2 tracking-wider" style={{ color: '#00ff88', fontFamily: 'monospace' }}>AIM TRAINER</h1>
        <p className="text-gray-500 mb-10">提升你的瞄准能力</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 max-w-4xl w-full">
          {[
            { id: 'flick' as const, name: 'Flick Shot', desc: '快速点击随机出现的目标', icon: '🎯', time: '30秒' },
            { id: 'tracking' as const, name: 'Tracking', desc: '持续跟踪移动目标', icon: '🌀', time: '20秒' },
            { id: 'reaction' as const, name: 'Reaction Time', desc: '测试反应速度', icon: '⚡', time: '5轮' },
          ].map(g => {
            const best = getBest(g.id)
            return (
              <button key={g.id} onClick={() => startGame(g.id)}
                className="rounded-xl p-6 text-left transition-all hover:scale-105 border"
                style={{ background: '#12121a', borderColor: '#1e1e2e' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#00ff88')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e2e')}>
                <div className="text-4xl mb-3">{g.icon}</div>
                <h3 className="text-xl font-bold mb-1" style={{ color: '#00ff88' }}>{g.name}</h3>
                <p className="text-gray-400 text-sm mb-2">{g.desc}</p>
                <p className="text-xs" style={{ color: '#888', fontFamily: 'monospace' }}>{g.time}</p>
                {best && (
                  <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: '#1e1e2e', fontFamily: 'monospace', color: '#666' }}>
                    最佳: {best.score}分
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Flick Shot target size */}
        <div className="flex gap-3 mb-6">
          <span className="text-gray-500 text-sm">Flick 目标大小:</span>
          {(['small', 'medium', 'large'] as TargetSize[]).map(sz => (
            <button key={sz} onClick={() => setTargetSize(sz)}
              className="px-3 py-1 rounded text-sm border transition-colors"
              style={{
                borderColor: targetSize === sz ? '#00ff88' : '#1e1e2e',
                color: targetSize === sz ? '#00ff88' : '#666',
                background: targetSize === sz ? 'rgba(0,255,136,0.1)' : 'transparent'
              }}>
              {sz === 'small' ? '小' : sz === 'medium' ? '中' : '大'}
            </button>
          ))}
        </div>

        {/* History */}
        {getHistory().length > 0 && (
          <div className="max-w-2xl w-full">
            <h3 className="text-sm text-gray-500 mb-3" style={{ fontFamily: 'monospace' }}>最近记录</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {[...getHistory()].reverse().slice(0, 10).map((r, i) => (
                <div key={i} className="flex justify-between text-xs px-3 py-2 rounded" style={{ background: '#12121a', fontFamily: 'monospace' }}>
                  <span style={{ color: '#00ff88' }}>{r.mode}</span>
                  <span>{r.score}分</span>
                  <span>{r.accuracy}%</span>
                  <span className="text-gray-500">{new Date(r.date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Game canvas
  if (mode === 'flick' || mode === 'tracking' || mode === 'reaction') {
    return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" style={{ cursor: 'none' }} />
  }

  // Result
  if (mode === 'result' && result) {
    const history = getHistory().filter(r => r.mode === result.mode)
    const best = history.reduce((a, b) => b.score > a.score ? b : a, result)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#0a0a0f' }}>
        <h2 className="text-4xl font-bold mb-2" style={{ color: '#00ff88', fontFamily: 'monospace' }}>训练结束</h2>
        <p className="text-gray-500 mb-8">{result.mode}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: '得分', value: result.score },
            { label: '准确率', value: result.accuracy + '%' },
            { label: '平均时间', value: result.avgTime + 'ms' },
            { label: '历史最佳', value: best.score + '分' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
              <div className="text-xs text-gray-500 mb-1">{s.label}</div>
              <div className="text-2xl font-bold" style={{ color: '#00ff88', fontFamily: 'monospace' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button onClick={() => startGame(result.mode as any)}
            className="px-6 py-3 rounded-lg font-bold transition-colors"
            style={{ background: '#00ff88', color: '#0a0a0f' }}>
            再来一次
          </button>
          <button onClick={() => setMode('menu')}
            className="px-6 py-3 rounded-lg font-bold border transition-colors"
            style={{ borderColor: '#1e1e2e', color: '#888' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#00ff88')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e2e')}>
            返回菜单
          </button>
        </div>
      </div>
    )
  }

  return null
}

function spawnTarget(canvas: HTMLCanvasElement, s: any, size: TargetSize) {
  const r = SIZES[size]
  const margin = r + 40
  s.target = {
    x: margin + Math.random() * (canvas.width - 2 * margin),
    y: margin + Math.random() * (canvas.height - 2 * margin),
    r, spawnTime: Date.now(), _scale: 0,
  }
}

function spawnMovingTarget(canvas: HTMLCanvasElement, s: any) {
  const r = 40
  s.target = {
    x: r + Math.random() * (canvas.width - 2 * r),
    y: r + Math.random() * (canvas.height - 2 * r),
    r,
    vx: (1.5 + Math.random() * 2) * (Math.random() > 0.5 ? 1 : -1),
    vy: (1.5 + Math.random() * 2) * (Math.random() > 0.5 ? 1 : -1),
    _scale: 0,
  }
}
