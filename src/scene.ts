import * as THREE from 'three'

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
const raycaster = new THREE.Raycaster()
const zPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)

export function initScene(container: HTMLElement) {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x080810)
  scene.fog = new THREE.FogExp2(0x080810, 0.006)

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200)
  camera.position.set(0, 0, 50)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  container.appendChild(renderer.domElement)

  // ── Lighting ──
  scene.add(new THREE.AmbientLight(0x303050, 0.4))

  // Overhead spot — the main "room light"
  const spot = new THREE.SpotLight(0xeeeeff, 12, 120, Math.PI / 2.5, 0.6, 1)
  spot.position.set(0, 40, 25)
  spot.target.position.set(0, 0, 0)
  spot.castShadow = true
  spot.shadow.mapSize.set(512, 512)
  scene.add(spot)
  scene.add(spot.target)

  // Accent lights
  const cyan = new THREE.PointLight(0x00ccff, 3, 100)
  cyan.position.set(-40, -10, 30)
  scene.add(cyan)
  const green = new THREE.PointLight(0x00ff88, 3, 100)
  green.position.set(40, 10, 30)
  scene.add(green)

  // ── Room geometry (fills the camera view) ──
  const bounds = getVisibleBounds()
  const w = bounds.halfW * 2.2
  const h = bounds.halfH * 2.2

  // Floor
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0e0e1a, roughness: 0.85, metalness: 0.1 })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.5, 80), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, -h / 2, 0)
  floor.receiveShadow = true
  scene.add(floor)

  // Floor grid (bright enough to see)
  const fGrid = new THREE.GridHelper(w * 1.5, Math.round(w / 3), 0x222244, 0x181838)
  fGrid.position.set(0, -h / 2 + 0.05, 0)
  scene.add(fGrid)

  // Back wall
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0b16, roughness: 0.9, metalness: 0.05 })
  const bWall = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.5, h * 2.5), wallMat)
  bWall.position.set(0, 0, -15)
  bWall.receiveShadow = true
  scene.add(bWall)

  const bGrid = new THREE.GridHelper(w * 1.5, Math.round(w / 4), 0x1e1e3a, 0x141430)
  bGrid.rotation.x = Math.PI / 2
  bGrid.position.set(0, 0, -14.8)
  scene.add(bGrid)

  // Left wall
  const lWall = new THREE.Mesh(new THREE.PlaneGeometry(80, h * 2.5), wallMat)
  lWall.rotation.y = Math.PI / 2
  lWall.position.set(-w / 2, 0, 0)
  scene.add(lWall)

  const lGrid = new THREE.GridHelper(80, 15, 0x1e1e3a, 0x141430)
  lGrid.rotation.z = Math.PI / 2
  lGrid.position.set(-w / 2 + 0.05, 0, 0)
  scene.add(lGrid)

  // Right wall
  const rWall = new THREE.Mesh(new THREE.PlaneGeometry(80, h * 2.5), wallMat)
  rWall.rotation.y = -Math.PI / 2
  rWall.position.set(w / 2, 0, 0)
  scene.add(rWall)

  const rGrid = new THREE.GridHelper(80, 15, 0x1e1e3a, 0x141430)
  rGrid.rotation.z = Math.PI / 2
  rGrid.position.set(w / 2 - 0.05, 0, 0)
  scene.add(rGrid)

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.5, 80), new THREE.MeshStandardMaterial({ color: 0x090912, roughness: 0.9 }))
  ceil.rotation.x = Math.PI / 2
  ceil.position.set(0, h / 2, 0)
  scene.add(ceil)

  // ── Edge glow trim ──
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.25 })
  const hw = w / 2, hh = h / 2

  // Floor edges
  addEdge(edgeMat, [[-hw, -hh + 0.1, -15], [hw, -hh + 0.1, -15], [hw, -hh + 0.1, 30], [-hw, -hh + 0.1, 30], [-hw, -hh + 0.1, -15]])
  // Back wall bottom
  addEdge(edgeMat, [[-hw, -hh, -14.9], [hw, -hh, -14.9], [hw, hh, -14.9], [-hw, hh, -14.9], [-hw, -hh, -14.9]])
  // Side wall edges
  addEdge(new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.15 }),
    [[-hw + 0.1, -hh, -15], [-hw + 0.1, hh, -15]])
  addEdge(new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.15 }),
    [[hw - 0.1, -hh, -15], [hw - 0.1, hh, -15]])

  window.addEventListener('resize', onResize)
}

function addEdge(mat: THREE.LineBasicMaterial, pts: [number, number, number][]) {
  const geo = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])))
  scene.add(new THREE.Line(geo, mat))
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
