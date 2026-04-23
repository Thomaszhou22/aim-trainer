import { useState, useRef, useEffect, useCallback } from 'react'
import { type GameState, makeResult } from './engine'
import { MODES, CATEGORIES, type GameResult, getHistory, saveHistory, getBest } from './types'
import { HANDLERS } from './modes'
import { initScene, disposeScene, renderScene, getVisibleBounds, screenToWorld } from './scene'
import { syncTargets, updateMeshes, updateParticles, clearAll } from './targets'
import type { Target } from './engine'

type Screen = 'menu' | 'game' | 'result'

function Crosshair() {
  const [pos, setPos] = useState({ x: -100, y: -100 })
  useEffect(() => {
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])
  return (
    <div style={{ position: 'fixed', left: pos.x - 16, top: pos.y - 16, pointerEvents: 'none', zIndex: 100 }}>
      <svg width="32" height="32" viewBox="0 0 32 32">
        <line x1="16" y1="2" x2="16" y2="12" stroke="#00ff88" strokeWidth="2" />
        <line x1="16" y1="20" x2="16" y2="30" stroke="#00ff88" strokeWidth="2" />
        <line x1="2" y1="16" x2="12" y2="16" stroke="#00ff88" strokeWidth="2" />
        <line x1="20" y1="16" x2="30" y2="16" stroke="#00ff88" strokeWidth="2" />
        <circle cx="16" cy="16" r="2" fill="none" stroke="#00ff88" strokeWidth="1.5" opacity="0.6" />
      </svg>
    </div>
  )
}

function HUDOverlay({ stateRef }: { stateRef: React.RefObject<GameState> }) {
  const [hud, setHud] = useState({ score: 0, time: 0, clicks: 0, hits: 0 })
  useEffect(() => {
    const iv = setInterval(() => {
      const s = stateRef.current
      if (!s.running) return
      const elapsed = Math.max(0, (s.duration - (Date.now() - s.startTime) / 1000))
      setHud({ score: s.score, time: Math.ceil(elapsed), clicks: s.clicks, hits: s.hits })
    }, 100)
    return () => clearInterval(iv)
  }, [stateRef])
  const acc = hud.clicks > 0 ? Math.round(hud.hits / hud.clicks * 100) : 0
  return (
    <div className="fixed top-0 left-0 right-0 pointer-events-none z-50" style={{ fontFamily: 'monospace' }}>
      <div className="flex justify-between items-start p-4">
        <div className="text-left">
          <div className="text-3xl font-bold" style={{ color: '#00ff88', textShadow: '0 0 10px #00ff8866' }}>{hud.score}</div>
          <div className="text-xs" style={{ color: '#666' }}>SCORE</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: hud.time <= 5 ? '#ff3366' : '#ffffff' }}>{hud.time}s</div>
        </div>
        <div className="text-right">
          <div className="text-lg" style={{ color: '#00ccff' }}>{acc}%</div>
          <div className="text-xs" style={{ color: '#666' }}>ACC</div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [, setActiveMode] = useState<string | null>(null)
  const [result, setResult] = useState<GameResult | null>(null)
  const [tab, setTab] = useState('flicking')
  const containerRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<GameState>({} as GameState)
  const rafRef = useRef(0)
  const pendingModeRef = useRef<string | null>(null)

  const stopGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const s = stateRef.current
    if (s._cleanup) s._cleanup()
    if (s._spawnTimer) clearTimeout(s._spawnTimer)
    if (s._reactionTimer) clearTimeout(s._reactionTimer)
    if (s._scatterTimer) clearTimeout(s._scatterTimer)
    s.running = false
  }, [])

  const startGame = useCallback((modeId: string) => {
    setResult(null)
    pendingModeRef.current = modeId
    setScreen('game')
  }, [])

  const endGame = useCallback((s: GameState) => {
    s.running = false
    const r = makeResult(s)
    setResult(r)
    saveHistory(r)
    setScreen('result')
  }, [])

  // Game loop
  useEffect(() => {
    const modeId = pendingModeRef.current
    if (screen !== 'game' || !modeId) return
    pendingModeRef.current = null

    const container = containerRef.current
    if (!container) return

    const modeDef = MODES.find(m => m.id === modeId)
    if (!modeDef) return
    const handler = HANDLERS[modeId]
    if (!handler) return

    setActiveMode(modeId)

    const bounds = getVisibleBounds()
    const worldW = bounds.halfW * 2
    const worldH = bounds.halfH * 2

    const s = stateRef.current
    Object.assign(s, {
      running: true, mode: modeId, score: 0, hits: 0, clicks: 0, totalTime: 0,
      startTime: Date.now(), duration: modeDef.duration,
      targets: [] as Target[], mouseX: 0, mouseY: 0,
      reactionRound: 0, reactionTimes: [], reactionState: 'waiting', reactionColorTime: 0,
      trackingTime: 0, trackingOnTarget: 0, accuracy: 0,
      detectionRound: 0, spiderRound: 0,
      _worldW: worldW, _worldH: worldH,
    })

    // Clear any leftover meshes
    clearAll()

    handler.init(worldW, worldH, s)

    const onMouse = (e: MouseEvent) => {
      const wp = screenToWorld(e.clientX, e.clientY)
      if (wp) { s.mouseX = wp.x; s.mouseY = wp.y }
    }
    const onClick = (e: MouseEvent) => {
      if (!s.running) return
      handler.onClick(e.clientX, e.clientY, s)
    }

    window.addEventListener('mousemove', onMouse)
    window.addEventListener('click', onClick)
    s._cleanup = () => {
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('click', onClick)
    }

    let lastTime = performance.now()

    const draw = () => {
      if (!s.running) return
      const now = performance.now()
      const dt = (now - lastTime) / 1000
      lastTime = now

      // Check end for untimed modes
      if (handler.checkEnd) {
        const r = handler.checkEnd(s)
        if (r) {
          clearAll()
          renderScene()
          setResult(r); saveHistory(r); setScreen('result')
          s.running = false
          return
        }
      }

      // Check timed end
      if (modeDef.duration > 0) {
        const elapsed = (Date.now() - s.startTime) / 1000
        if (elapsed >= modeDef.duration) {
          clearAll()
          renderScene()
          endGame(s)
          return
        }
      }

      handler.update(worldW, worldH, s)
      syncTargets(s.targets)
      updateMeshes(s.targets, now / 1000)
      updateParticles(dt)
      renderScene()

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      clearAll()
    }
  }, [screen, endGame])

  // Cleanup scene on result screen
  useEffect(() => {
    if (screen === 'result' && containerRef.current) {
      disposeScene(containerRef.current)
    }
  }, [screen])

  // Ref callback for game scene init (must be before conditional returns)
  const gameRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    containerRef.current = el
    if (!el.querySelector('canvas')) {
      initScene(el)
    }
  }, [])

  // ESC handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stateRef.current.running) {
        stopGame()
        setScreen('menu')
        setActiveMode(null)
        if (containerRef.current) disposeScene(containerRef.current)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      stopGame()
    }
  }, [stopGame])

  // ─── Menu ───
  if (screen === 'menu') {
    return (
      <div className="min-h-screen flex flex-col items-center p-6" style={{ background: '#0a0a0f' }}>
        <h1 className="text-5xl font-bold mb-1 tracking-widest mt-6" style={{ color: '#00ff88', fontFamily: 'monospace' }}>AIM TRAINER</h1>
        <p className="text-gray-500 mb-8">提升你的瞄准能力</p>

        {/* Category tabs */}
        <div className="flex gap-2 mb-8 flex-wrap justify-center">
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setTab(c.id)}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-all border"
              style={{
                borderColor: tab === c.id ? c.color : '#1e1e2e',
                color: tab === c.id ? c.color : '#555',
                background: tab === c.id ? c.color + '15' : 'transparent',
              }}>
              {c.name}
            </button>
          ))}
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
          {MODES.filter(m => m.category === tab).map(m => {
            const best = getBest(m.id)
            return (
              <button key={m.id} onClick={() => startGame(m.id)}
                className="rounded-xl p-5 text-left transition-all hover:scale-[1.03] border text-start"
                style={{ background: '#12121a', borderColor: '#1e1e2e' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.boxShadow = `0 0 20px ${m.color}22` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.boxShadow = 'none' }}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{m.icon}</span>
                  <h3 className="text-lg font-bold" style={{ color: m.color }}>{m.name}</h3>
                </div>
                <p className="text-gray-400 text-sm mb-3">{m.desc}</p>
                <div className="flex justify-between text-xs" style={{ fontFamily: 'monospace', color: '#666' }}>
                  <span>{m.duration > 0 ? `${m.duration}秒` : '10轮'}</span>
                  {best && <span style={{ color: '#00ff88' }}>最佳: {best.score}</span>}
                </div>
              </button>
            )
          })}
        </div>

        {/* History */}
        {getHistory().length > 0 && (
          <div className="max-w-2xl w-full mt-10">
            <h3 className="text-sm text-gray-500 mb-3" style={{ fontFamily: 'monospace' }}>最近记录</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {[...getHistory()].reverse().slice(0, 10).map((r, i) => (
                <div key={i} className="flex justify-between text-xs px-3 py-2 rounded" style={{ background: '#12121a', fontFamily: 'monospace' }}>
                  <span style={{ color: '#00ff88' }}>{MODES.find(m => m.id === r.mode)?.name || r.mode}</span>
                  <span>{r.score}分</span>
                  <span>{r.accuracy}%</span>
                  <span className="text-gray-500">{r.avgTime}ms</span>
                  <span className="text-gray-600">{new Date(r.date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Game ───
  if (screen === 'game') {
    return (
      <div ref={gameRef} className="fixed inset-0 w-full h-full" style={{ cursor: 'none' }}>
        <Crosshair />
        <HUDOverlay stateRef={stateRef} />
      </div>
    )
  }
  // ─── Result ───
  if (screen === 'result' && result) {
    const best = getBest(result.mode)
    const modeDef = MODES.find(m => m.id === result.mode)
    const isNewBest = !best || result.score > best.score
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#0a0a0f' }}>
        <h2 className="text-4xl font-bold mb-2" style={{ color: modeDef?.color || '#00ff88', fontFamily: 'monospace' }}>训练结束</h2>
        <p className="text-gray-500 mb-2">{modeDef?.name || result.mode}</p>
        {isNewBest && <p className="text-yellow-400 text-sm mb-6 font-bold">🏆 新纪录！</p>}
        {!isNewBest && <div className="mb-6" />}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: '得分', value: String(result.score) },
            { label: '准确率', value: result.accuracy + '%' },
            { label: '平均时间', value: result.avgTime + 'ms' },
            { label: '历史最佳', value: (best?.score || result.score) + '分' },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-4 text-center" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
              <div className="text-xs text-gray-500 mb-1">{item.label}</div>
              <div className="text-2xl font-bold" style={{ color: '#00ff88', fontFamily: 'monospace' }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button onClick={() => startGame(result.mode)}
            className="px-6 py-3 rounded-lg font-bold transition-colors cursor-pointer"
            style={{ background: '#00ff88', color: '#0a0a0f' }}>
            再来一次
          </button>
          <button onClick={() => setScreen('menu')}
            className="px-6 py-3 rounded-lg font-bold border transition-colors cursor-pointer"
            style={{ borderColor: '#1e1e2e', color: '#888' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#00ff88'; e.currentTarget.style.color = '#00ff88' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.color = '#888' }}>
            返回菜单
          </button>
        </div>
      </div>
    )
  }

  return null
}
