import * as THREE from 'three'

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
const raycaster = new THREE.Raycaster()
const zPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)

export function initScene(container: HTMLElement) {
  scene = new THREE.Scene()
  // Aim Lab default: dark gray background, NOT black
  scene.background = new THREE.Color(0x1a1a1a)
  scene.fog = new THREE.Fog(0x1a1a1a, 60, 140)

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200)
  camera.position.set(0, 0, 50)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  container.appendChild(renderer.domElement)

  // ── Aim Lab lighting: neutral, even, not colored ──
  // Soft ambient fill
  scene.add(new THREE.AmbientLight(0x888888, 0.6))

  // Main directional light (overhead, like Aim Lab's sun)
  const sun = new THREE.DirectionalLight(0xffffff, 1.2)
  sun.position.set(5, 30, 20)
  scene.add(sun)

  // Fill light from below-front
  const fill = new THREE.DirectionalLight(0xcccccc, 0.4)
  fill.position.set(-10, -5, 15)
  scene.add(fill)

  // ── Room (Graybox style — visible gray walls/floor) ──
  const bounds = getVisibleBounds()
  const hw = bounds.halfW * 1.2
  const hh = bounds.halfH * 1.2

  const wallColor = 0x2a2a2a  // medium gray walls — clearly visible
  const gridColor1 = 0x444444  // grid lines — visible against gray walls
  const gridColor2 = 0x363636

  // Floor
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.95, metalness: 0.0 })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(hw * 3, 100), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, -hh, 0)
  scene.add(floor)

  // Floor grid
  const fGrid = new THREE.GridHelper(hw * 3, Math.round(hw * 3 / 3), gridColor1, gridColor2)
  fGrid.position.set(0, -hh + 0.02, 0)
  scene.add(fGrid)

  // Back wall
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.95, metalness: 0.0 })
  const bWall = new THREE.Mesh(new THREE.PlaneGeometry(hw * 3, hh * 3), wallMat)
  bWall.position.set(0, 0, -18)
  scene.add(bWall)

  // Back wall grid (subtle)
  const bGrid = new THREE.GridHelper(hw * 3, Math.round(hw * 3 / 4), 0x333333, 0x2d2d2d)
  bGrid.rotation.x = Math.PI / 2
  bGrid.position.set(0, 0, -17.9)
  scene.add(bGrid)

  // Left wall
  const lWall = new THREE.Mesh(new THREE.PlaneGeometry(100, hh * 3), wallMat)
  lWall.rotation.y = Math.PI / 2
  lWall.position.set(-hw, 0, 0)
  scene.add(lWall)

  const lGrid = new THREE.GridHelper(100, 20, 0x333333, 0x2d2d2d)
  lGrid.rotation.z = Math.PI / 2
  lGrid.position.set(-hw + 0.02, 0, 0)
  scene.add(lGrid)

  // Right wall
  const rWall = new THREE.Mesh(new THREE.PlaneGeometry(100, hh * 3), wallMat)
  rWall.rotation.y = -Math.PI / 2
  rWall.position.set(hw, 0, 0)
  scene.add(rWall)

  const rGrid = new THREE.GridHelper(100, 20, 0x333333, 0x2d2d2d)
  rGrid.rotation.z = Math.PI / 2
  rGrid.position.set(hw - 0.02, 0, 0)
  scene.add(rGrid)

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(hw * 3, 100), new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.95 }))
  ceil.rotation.x = Math.PI / 2
  ceil.position.set(0, hh, 0)
  scene.add(ceil)

  window.addEventListener('resize', onResize)
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

export function getScene() { return scene }
export function getCamera() { return camera }
export function renderScene() { renderer.render(scene, camera) }

export function screenToWorld(sx: number, sy: number): THREE.Vector3 | null {
  const ndc = new THREE.Vector2(
    (sx / window.innerWidth) * 2 - 1,
    -(sy / window.innerHeight) * 2 + 1
  )
  raycaster.setFromCamera(ndc, camera)
  const target = new THREE.Vector3()
  const hit = raycaster.ray.intersectPlane(zPlane, target)
  return hit ? target : null
}

export function worldToScreen(wx: number, wy: number): { x: number; y: number } {
  const v = new THREE.Vector3(wx, wy, 0).project(camera)
  return {
    x: (v.x + 1) / 2 * window.innerWidth,
    y: (-v.y + 1) / 2 * window.innerHeight,
  }
}

export function getVisibleBounds(): { halfW: number; halfH: number } {
  const vFov = camera.fov * Math.PI / 180
  const halfH = Math.tan(vFov / 2) * camera.position.z
  const halfW = halfH * camera.aspect
  return { halfW, halfH }
}

export function disposeScene(container: HTMLElement) {
  window.removeEventListener('resize', onResize)
  renderer.dispose()
  if (container.contains(renderer.domElement)) {
    container.removeChild(renderer.domElement)
  }
  scene.clear()
}
