import * as THREE from 'three'

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
const raycaster = new THREE.Raycaster()
const zPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)

export function initScene(container: HTMLElement) {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x080810)
  scene.fog = new THREE.FogExp2(0x080810, 0.008)

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200)
  camera.position.set(0, 0, 45)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  container.appendChild(renderer.domElement)

  // ── Lighting ──
  // Dim ambient so targets glow
  scene.add(new THREE.AmbientLight(0x303050, 0.6))

  // Key light from above-front (mimics Aim Lab overhead lighting)
  const keyLight = new THREE.SpotLight(0xffffff, 15, 120, Math.PI / 3, 0.5, 1)
  keyLight.position.set(0, 30, 30)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(1024, 1024)
  scene.add(keyLight)
  scene.add(keyLight.target)

  // Fill lights — cyan & green accent (subtle)
  const fill1 = new THREE.PointLight(0x00ff88, 2, 80)
  fill1.position.set(-30, -5, 20)
  scene.add(fill1)

  const fill2 = new THREE.PointLight(0x0088ff, 2, 80)
  fill2.position.set(30, 5, 20)
  scene.add(fill2)

  // ── Floor ──
  const floorGeo = new THREE.PlaneGeometry(200, 120)
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0c0c18,
    roughness: 0.9,
    metalness: 0.1,
  })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -30
  floor.receiveShadow = true
  scene.add(floor)

  // Floor grid lines (custom — brighter than Aim Lab but subtle)
  const floorGrid = new THREE.GridHelper(200, 40, 0x1a1a30, 0x12122a)
  floorGrid.position.y = -29.9
  scene.add(floorGrid)

  // ── Back wall ──
  const wallGeo = new THREE.PlaneGeometry(200, 100)
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a16,
    roughness: 0.95,
    metalness: 0.05,
  })
  const backWall = new THREE.Mesh(wallGeo, wallMat)
  backWall.position.z = -20
  backWall.receiveShadow = true
  scene.add(backWall)

  // Back wall grid
  const wallGrid = new THREE.GridHelper(200, 30, 0x181830, 0x101028)
  wallGrid.rotation.x = Math.PI / 2
  wallGrid.position.z = -19.8
  scene.add(wallGrid)

  // ── Left wall ──
  const leftWall = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 100),
    new THREE.MeshStandardMaterial({ color: 0x090914, roughness: 0.95 })
  )
  leftWall.rotation.y = Math.PI / 2
  leftWall.position.x = -60
  scene.add(leftWall)

  // Left wall grid
  const leftGrid = new THREE.GridHelper(120, 20, 0x181830, 0x101028)
  leftGrid.rotation.z = Math.PI / 2
  leftGrid.position.x = -59.8
  scene.add(leftGrid)

  // ── Right wall ──
  const rightWall = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 100),
    new THREE.MeshStandardMaterial({ color: 0x090914, roughness: 0.95 })
  )
  rightWall.rotation.y = -Math.PI / 2
  rightWall.position.x = 60
  scene.add(rightWall)

  const rightGrid = new THREE.GridHelper(120, 20, 0x181830, 0x101028)
  rightGrid.rotation.z = Math.PI / 2
  rightGrid.position.x = 59.8
  scene.add(rightGrid)

  // ── Ceiling ──
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 120),
    new THREE.MeshStandardMaterial({ color: 0x080812, roughness: 0.95 })
  )
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.y = 30
  scene.add(ceiling)

  // ── Edge glow lines (sci-fi trim) ──
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.15 })
  // Floor edges
  const floorEdgeGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-60, -29.8, -20),
    new THREE.Vector3(60, -29.8, -20),
    new THREE.Vector3(60, -29.8, 20),
    new THREE.Vector3(-60, -29.8, 20),
    new THREE.Vector3(-60, -29.8, -20),
  ])
  scene.add(new THREE.Line(floorEdgeGeo, edgeMat))

  // Back wall edges
  const wallEdgeGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-60, -30, -19.8),
    new THREE.Vector3(60, -30, -19.8),
    new THREE.Vector3(60, 30, -19.8),
    new THREE.Vector3(-60, 30, -19.8),
    new THREE.Vector3(-60, -30, -19.8),
  ])
  scene.add(new THREE.Line(wallEdgeGeo, edgeMat))

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

export function setBackground(color: number) {
  scene.background = new THREE.Color(color)
}

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
