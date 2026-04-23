import * as THREE from 'three'
import { getScene, getCamera } from './scene'
import type { Target } from './engine'

interface TargetEntry {
  mesh: THREE.Mesh
  target: Target
}

const meshMap = new Map<number, TargetEntry>()
const particles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = []

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

  const geo = new THREE.SphereGeometry(r, 24, 24)
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.4,
    metalness: 0.3,
    roughness: 0.4,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(t.x, t.y, 0)
  mesh.scale.setScalar(0)
  getScene().add(mesh)

  // Glow sprite
  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = 64
  glowCanvas.height = 64
  const gctx = glowCanvas.getContext('2d')!
  const hex = '#' + color.getHexString()
  const grad = gctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, hex + '66')
  grad.addColorStop(0.5, hex + '22')
  grad.addColorStop(1, '#00000000')
  gctx.fillStyle = grad
  gctx.fillRect(0, 0, 64, 64)
  const glowTex = new THREE.CanvasTexture(glowCanvas)
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.5, depthWrite: false })
  const glow = new THREE.Sprite(glowMat)
  glow.scale.set(r * 5, r * 5, 1)
  mesh.add(glow)

  meshMap.set(t.id, { mesh, target: t })
}

export function updateMeshes(targets: Target[], time: number) {
  for (const t of targets) {
    const entry = meshMap.get(t.id)
    if (!entry) continue

    if (t.scale < 1) t.scale = Math.min(1, t.scale + 0.08)
    entry.mesh.scale.setScalar(t.scale)
    entry.mesh.position.set(t.x, t.y, 0)
    entry.mesh.rotation.y = time * 0.8
    entry.mesh.rotation.x = time * 0.4

    if (t.visible === false) {
      entry.mesh.visible = false
    } else {
      entry.mesh.visible = true
    }
  }
}

export function hitTestTarget(sx: number, sy: number, target: Target): boolean {
  const entry = meshMap.get(target.id)
  if (!entry) return false

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
  const count = 10
  for (let i = 0; i < count; i++) {
    const geo = new THREE.BoxGeometry(0.25, 0.25, 0.25)
    const mat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, 0)
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3
    const speed = 0.2 + Math.random() * 0.4
    const vel = new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, (Math.random() - 0.5) * speed)
    getScene().add(mesh)
    particles.push({ mesh, vel, life: 1 })
  }
}

export function updateParticles(dt: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.mesh.position.addScaledVector(p.vel, dt * 60)
    p.vel.y -= 0.015 * dt * 60
    p.life -= dt * 3
    p.mesh.scale.setScalar(Math.max(0, p.life))
    if (p.life <= 0) {
      getScene().remove(p.mesh)
      p.mesh.geometry.dispose()
      ;(p.mesh.material as THREE.Material).dispose()
      particles.splice(i, 1)
    }
  }
}

export function clearAll() {
  for (const [, entry] of meshMap) {
    getScene().remove(entry.mesh)
    entry.mesh.geometry.dispose()
  }
  meshMap.clear()
  for (const p of particles) {
    getScene().remove(p.mesh)
    p.mesh.geometry.dispose()
  }
  particles.length = 0
}
