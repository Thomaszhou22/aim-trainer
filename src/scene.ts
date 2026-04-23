import * as THREE from 'three'

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
const raycaster = new THREE.Raycaster()
const zPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)

export function initScene(container: HTMLElement) {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a0f)
  scene.fog = new THREE.FogExp2(0x0a0a0f, 0.004)

  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200)
  camera.position.set(0, 0, 50)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  // Lights
  scene.add(new THREE.AmbientLight(0x404060, 2))
  const p1 = new THREE.PointLight(0xffffff, 2.5, 120)
  p1.position.set(0, 15, 35)
  scene.add(p1)
  const p2 = new THREE.PointLight(0x00ff88, 0.8, 100)
  p2.position.set(-25, -10, 25)
  scene.add(p2)
  const p3 = new THREE.PointLight(0x00ccff, 0.5, 100)
  p3.position.set(25, 10, 25)
  scene.add(p3)

  // Grid floor
  const grid = new THREE.GridHelper(140, 28, 0x181828, 0x181828)
  grid.position.y = -35
  scene.add(grid)

  // Back wall grid
  const wallGrid = new THREE.GridHelper(140, 28, 0x121220, 0x121220)
  wallGrid.rotation.x = Math.PI / 2
  wallGrid.position.z = -15
  scene.add(wallGrid)

  // Side walls
  const leftWall = new THREE.GridHelper(70, 14, 0x121220, 0x121220)
  leftWall.rotation.z = Math.PI / 2
  leftWall.position.x = -70
  scene.add(leftWall)

  const rightWall = new THREE.GridHelper(70, 14, 0x121220, 0x121220)
  rightWall.rotation.z = Math.PI / 2
  rightWall.position.x = 70
  scene.add(rightWall)

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
