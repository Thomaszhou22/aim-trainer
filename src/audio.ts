let _ctx: AudioContext | null = null

export function getAudioCtx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext()
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

export function playHit() {
  try {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain).connect(ctx.destination)
    osc.frequency.value = 1000
    gain.gain.value = 0.1
    osc.start()
    osc.stop(ctx.currentTime + 0.03)
  } catch { /* ignore */ }
}

export function playMiss() {
  try {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain).connect(ctx.destination)
    osc.frequency.value = 300
    gain.gain.value = 0.1
    osc.start()
    osc.stop(ctx.currentTime + 0.08)
  } catch { /* ignore */ }
}
