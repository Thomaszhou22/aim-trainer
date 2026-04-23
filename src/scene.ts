import * as THREE from 'three'

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
const raycaster = new THREE.Raycaster()
const zPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)

export function initScene(container: HTMLElement) {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050508)
  scene.fog = new THREE.FogExp2(0x050508, 0.005)

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200)
  camera.position.set(0, 0, 50)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.9
  container.appendChild(renderer.domElement)

  // ── Lighting ──
  scene.add(new THREE.AmbientLight(0x404060, 0.8))

  const spot = new THREE.SpotLight(0xffffff, 10, 150, Math.PI / 2.5, 0.7, 1)
  spot.position.set(0, 35, 30)
  spot.target.position.set(0, 0, 0)
  spot.castShadow = true
  scene.add(spot)
  scene.add(spot.target)

  const cyan = new THREE.PointLight(0x00ccff, 4, 100)
  cyan.position.set(-40, -10, 30)
  scene.add(cyan)
  const green = new THREE.PointLight(0x00ff88, 4, 100)
  green.position.set(40, 10, 30)
  scene.add(green)

  // ── Room — sized to fill camera view ──
  const bounds = getVisibleBounds()
  const hw = bounds.halfW * 1.15
  const hh = bounds.halfH * 1.15

  // Floor — noticeably visible
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x141425, roughness: 0.8, metalness: 0.2 })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(hw * 3, 80), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, -hh, 0)
  floor.receiveShadow = true
  scene.add(floor)

  // Floor grid — bright enough to see clearly
  const fGrid = new THREE.GridHelper(hw * 3, Math.round(hw * 3 / 3), 0x2a2a55, 0x1e1e44)
  fGrid.position.set(0, -hh + 0.05, 0)
  scene.add(fGrid)

  // Back wall — lighter so it's visible
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x101020, roughness: 0.85, metalness: 0.1 })
  const bWall = new THREE.Mesh(new THREE.PlaneGeometry(hw * 3, hh * 3), wallMat)
  bWall.position.set(0, 0, -15)
  bWall.receiveShadow = true
  scene.add(bWall)

  const bGrid = new THREE.GridHelper(hw * 3, Math.round(hw * 3 / 4), 0x2a2a55, 0x1e1e44)
  bGrid.rotation.x = Math.PI / 2
  bGrid.position.set(0, 0, -14.8)
  scene.add(bGrid)

  // Left wall
  const lWall = new THREE.Mesh(new THREE.PlaneGeometry(80, hh * 3), wallMat)
  lWall.rotation.y = Math.PI / 2
  lWall.position.set(-hw, 0, 0)
  scene.add(lWall)
  const lGrid = new THREE.GridHelper(80, 15, 0x2a2a55, 0x1e1e44)
  lGrid.rotation.z = Math.PI / 2
  lGrid.position.set(-hw + 0.05, 0, 0)
  scene.add(lGrid)

  // Right wall
  const rWall = new THREE.Mesh(new THREE.PlaneGeometry(80, hh * 3), wallMat)
  rWall.rotation.y = -Math.PI / 2
  rWall.position.set(hw, 0, 0)
  scene.add(rWall)
  const rGrid = new THREE.GridHelper(80, 15, 0x2a2a55, 0x1e1e44)
  rGrid.rotation.z = Math.PI / 2
  rGrid.position.set(hw - 0.05, 0, 0)
  scene.add(rGrid)

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(hw * 3, 80), new THREE.MeshStandardMaterial({ color: 0x0c0c18, roughness: 0.9 }))
  ceil.rotation.x = Math.PI / 2
  ceil.position.set(0, hh, 0)
  scene.add(ceil)

  // ── Bright edge trim lines ──
  // Floor edges
  const greenMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.5 })
  addLine(greenMat, [[-hw, -hh + 0.1, -15], [hw, -hh + 0.1, -15], [hw, -hh + 0.1, 30], [-hw, -hh + 0.1, 30], [-hw, -hh + 0.1, -15]])

  // Wall bottom edges
  addLine(greenMat, [[-hw, -hh, -14.9], [hw, -hh, -14.9]])
  // Wall top edges
  addLine(greenMat, [[-hw, hh, -14.9], [hw, hh, -14.9]])
  // Wall left edge
  const cyanMat = new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.4 })
  addLine(cyanMat, [[-hw, -hh, -14.9], [-hw, hh, -14.9]])
  // Wall right edge
  addLine(cyanMat, [[hw, -hh, -14.9], [hw, hh, -14.9]])

  // Floor/wall intersection highlight
  addLine(new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.3 }), [[-hw, -hh, 0], [hw, -hh, 0]])

  window.addEventListener('resize', onResize)
}

function addLine(mat: THREE.LineBasicMaterial, pts: [number, number, number][]) {
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
