import * as THREE from 'three'

export class CameraController {
  private camera: THREE.PerspectiveCamera
  private domElement: HTMLElement
  private target: THREE.Vector3
  private spherical: THREE.Spherical
  private isDragging: boolean = false
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 }
  private rotateSpeed: number = 0.005
  private zoomSpeed: number = 0.1
  private minDistance: number = 2
  private maxDistance: number = 50

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera
    this.domElement = domElement
    this.target = new THREE.Vector3(0, 0, 0)
    this.spherical = new THREE.Spherical()

    const offset = new THREE.Vector3()
    offset.copy(camera.position).sub(this.target)
    this.spherical.setFromVector3(offset)

    this.bindEvents()
  }

  private bindEvents(): void {
    this.domElement.addEventListener('contextmenu', this.onContextMenu.bind(this))
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this))
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this))
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this))
    this.domElement.addEventListener('wheel', this.onWheel.bind(this))
    this.domElement.addEventListener('mouseleave', this.onMouseUp.bind(this))
  }

  private onContextMenu(event: Event): void {
    event.preventDefault()
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 2) {
      this.isDragging = true
      this.previousMousePosition = { x: event.clientX, y: event.clientY }
      this.domElement.style.cursor = 'grabbing'
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return

    const deltaX = event.clientX - this.previousMousePosition.x
    const deltaY = event.clientY - this.previousMousePosition.y

    this.spherical.theta -= deltaX * this.rotateSpeed
    this.spherical.phi += deltaY * this.rotateSpeed

    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi))

    this.updateCameraPosition()

    this.previousMousePosition = { x: event.clientX, y: event.clientY }
  }

  private onMouseUp(): void {
    this.isDragging = false
    this.domElement.style.cursor = 'default'
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault()

    const delta = event.deltaY > 0 ? 1 : -1
    this.spherical.radius += delta * this.spherical.radius * this.zoomSpeed

    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius))

    this.updateCameraPosition()
  }

  private updateCameraPosition(): void {
    const offset = new THREE.Vector3()
    offset.setFromSpherical(this.spherical)
    this.camera.position.copy(this.target).add(offset)
    this.camera.lookAt(this.target)
  }

  setTarget(target: THREE.Vector3): void {
    this.target.copy(target)
    this.updateCameraPosition()
  }

  getTarget(): THREE.Vector3 {
    return this.target.clone()
  }

  dispose(): void {
    this.domElement.removeEventListener('contextmenu', this.onContextMenu.bind(this))
    this.domElement.removeEventListener('mousedown', this.onMouseDown.bind(this))
    this.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this))
    this.domElement.removeEventListener('mouseup', this.onMouseUp.bind(this))
    this.domElement.removeEventListener('wheel', this.onWheel.bind(this))
    this.domElement.removeEventListener('mouseleave', this.onMouseUp.bind(this))
  }
}
