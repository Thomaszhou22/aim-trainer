import * as THREE from 'three'
import { getScene, getCamera } from './scene'
import type { Target } from './engine'

interface TargetEntry {
  mesh: THREE.Mesh
  glow: THREE.Sprite
  target: Target
}

const meshMap = new Map<number, TargetEntry>()
const particles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = []
const shockwaves: { ring: THREE.Mesh; life: number }[] = []

function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex)
}

export function syncTargets(targets: Target[]) {
  const activeIds = new Set<number>()
  for (const t of targets) {
    if (t.id !== undefined) activeIds.add(t.id)
  }

  for (const [id] of meshMap) {
    if (!activeIds.has(id)) {
      const entry = meshMap.get(id)!
      getScene().remove(entry.mesh)
      entry.mesh.geometry.dispose()
      ;(entry.mesh.material as THREE.Material).dispose()
      meshMap.delete(id)
    }
  }

  for (const t of targets) {
    if (t.id === undefined) continue
    if (!meshMap.has(t.id)) {
      createMesh(t)
    }
  }
}

function createMesh(t: Target) {
  const color = hexToColor(t.color || '#00aaff')
  const r = t.r || 1.5

  // Main sphere — high quality, metallic glass look like Aim Lab
  const geo = new THREE.SphereGeometry(r, 48, 48)
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.8,
    metalness: 0.4,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    envMapIntensity: 0.5,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(t.x, t.y, 0)
  mesh.scale.setScalar(0)
  mesh.castShadow = true
  getScene().add(mesh)

  // Outer glow ring (halo sprite)
  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = 128
  glowCanvas.height = 128
  const gctx = glowCanvas.getContext('2d')!
  const hex = '#' + color.getHexString()
  const grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, hex + 'aa')
  grad.addColorStop(0.3, hex + '44')
  grad.addColorStop(0.6, hex + '11')
  grad.addColorStop(1, '#00000000')
  gctx.fillStyle = grad
  gctx.fillRect(0, 0, 128, 128)
  const glowTex = new THREE.CanvasTexture(glowCanvas)
  const glowMat = new THREE.SpriteMaterial({
    map: glowTex,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const glow = new THREE.Sprite(glowMat)
  glow.scale.set(r * 6, r * 6, 1)
  mesh.add(glow)

  meshMap.set(t.id, { mesh, glow, target: t })
}

export function updateMeshes(targets: Target[], time: number) {
  for (const t of targets) {
    const entry = meshMap.get(t.id)
    if (!entry) continue

    // Scale-in animation
    if (t.scale < 1) t.scale = Math.min(1, t.scale + 0.08)
    entry.mesh.scale.setScalar(t.scale)

    // Position
    entry.mesh.position.set(t.x, t.y, 0)

    // Subtle float/rotation
    entry.mesh.rotation.y = time * 0.5
    entry.mesh.rotation.x = Math.sin(time * 0.8) * 0.1

    // Pulse glow
    const pulse = 1 + Math.sin(time * 3 + t.id) * 0.08
    entry.glow.scale.set(t.r * 6 * pulse, t.r * 6 * pulse, 1)

    // Visibility
    entry.mesh.visible = t.visible !== false
  }
}

export function hitTestTarget(sx: number, sy: number, target: Target): boolean {
  const entry = meshMap.get(target.id)
  if (!entry || !entry.mesh.visible) return false

  const mouse = new THREE.Vector2(
    (sx / window.innerWidth) * 2 - 1,
    -(sy / window.innerHeight) * 2 + 1
  )
  const rc = new THREE.Raycaster()
  rc.setFromCamera(mouse, getCamera())
  return rc.intersectObject(entry.mesh).length > 0
}

export function spawnParticles(x: number, y: number, color: string) {
  const c = hexToColor(color)
  const count = 16
  for (let i = 0; i < count; i++) {
    const size = 0.15 + Math.random() * 0.25
    const geo = new THREE.BoxGeometry(size, size, size)
    const mat = new THREE.MeshStandardMaterial({
      color: c,
      emissive: c,
      emissiveIntensity: 1.0,
      metalness: 0.5,
      roughness: 0.3,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, 0)
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5
    const speed = 0.3 + Math.random() * 0.5
    const vel = new THREE.Vector3(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      (Math.random() - 0.5) * speed * 0.8
    )
    getScene().add(mesh)
    particles.push({ mesh, vel, life: 1 })
  }

  // Shockwave ring
  const ringGeo = new THREE.RingGeometry(0.5, 1.0, 32)
  const ringMat = new THREE.MeshBasicMaterial({
    color: c,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.position.set(x, y, 0)
  getScene().add(ring)
  shockwaves.push({ ring, life: 1 })
}

export function updateParticles(dt: number) {
  // Cube particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.mesh.position.addScaledVector(p.vel, dt * 60)
    p.vel.y -= 0.012 * dt * 60
    p.life -= dt * 2.5
    p.mesh.scale.setScalar(Math.max(0, p.life))
    p.mesh.rotation.x += dt * 5
    p.mesh.rotation.z += dt * 3
    if (p.life <= 0) {
      getScene().remove(p.mesh)
      p.mesh.geometry.dispose()
      ;(p.mesh.material as THREE.Material).dispose()
      particles.splice(i, 1)
    }
  }

  // Shockwave rings
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const s = shockwaves[i]
    s.life -= dt * 3
    const scale = 1 + (1 - s.life) * 8
    s.ring.scale.setScalar(scale)
    ;(s.ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, s.life * 0.5)
    if (s.life <= 0) {
      getScene().remove(s.ring)
      s.ring.geometry.dispose()
      ;(s.ring.material as THREE.Material).dispose()
      shockwaves.splice(i, 1)
    }
  }
}

export function clearAll() {
  for (const [, entry] of meshMap) {
    getScene().remove(entry.mesh)
    entry.mesh.geometry.dispose()
    ;(entry.mesh.material as THREE.Material).dispose()
  }
  meshMap.clear()
  for (const p of particles) {
    getScene().remove(p.mesh)
    p.mesh.geometry.dispose()
    ;(p.mesh.material as THREE.Material).dispose()
  }
  particles.length = 0
  for (const s of shockwaves) {
    getScene().remove(s.ring)
    s.ring.geometry.dispose()
    ;(s.ring.material as THREE.Material).dispose()
  }
  shockwaves.length = 0
}
