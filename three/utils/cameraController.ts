import * as THREE from 'three'

/**
 * 相机控制器类
 * 实现右键拖动旋转视角、滚轮缩放功能
 */
export class CameraController {
  private camera: THREE.PerspectiveCamera
  private domElement: HTMLElement
  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  private isRightMouseDown: boolean = false
  private mouseX: number = 0
  private mouseY: number = 0
  private spherical: THREE.Spherical = new THREE.Spherical()
  private sphericalDelta: THREE.Spherical = new THREE.Spherical()
  private scale: number = 1
  private rotateSpeed: number = 1.0
  private zoomSpeed: number = 0.95

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera
    this.domElement = domElement

    // 初始化球坐标
    this.updateSpherical()

    // 绑定事件
    this.domElement.addEventListener('mousedown', this.onMouseDown)
    this.domElement.addEventListener('mousemove', this.onMouseMove)
    this.domElement.addEventListener('mouseup', this.onMouseUp)
    this.domElement.addEventListener('wheel', this.onWheel)
    this.domElement.addEventListener('contextmenu', this.onContextMenu)
  }

  /**
   * 更新球坐标
   */
  private updateSpherical(): void {
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.target)
    this.spherical.setFromVector3(offset)
  }

  /**
   * 应用球坐标更新相机位置
   */
  private updateCamera(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical)
    this.camera.position.copy(this.target).add(offset)
    this.camera.lookAt(this.target)
  }

  /**
   * 鼠标按下事件
   */
  private onMouseDown = (event: MouseEvent): void => {
    if (event.button === 2) {
      // 右键
      this.isRightMouseDown = true
      this.mouseX = event.clientX
      this.mouseY = event.clientY
    }
  }

  /**
   * 鼠标移动事件
   */
  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isRightMouseDown) return

    const deltaX = event.clientX - this.mouseX
    const deltaY = event.clientY - this.mouseY

    this.mouseX = event.clientX
    this.mouseY = event.clientY

    // 计算旋转角度
    const theta = -deltaX * 0.01 * this.rotateSpeed
    const phi = -deltaY * 0.01 * this.rotateSpeed

    this.sphericalDelta.theta = theta
    this.sphericalDelta.phi = phi

    // 应用旋转
    this.spherical.theta += this.sphericalDelta.theta
    this.spherical.phi += this.sphericalDelta.phi

    // 限制phi角度范围，避免翻转
    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi))

    this.sphericalDelta.set(0, 0, 0)
    this.updateCamera()
  }

  /**
   * 鼠标释放事件
   */
  private onMouseUp = (event: MouseEvent): void => {
    if (event.button === 2) {
      this.isRightMouseDown = false
    }
  }

  /**
   * 滚轮事件
   */
  private onWheel = (event: WheelEvent): void => {
    event.preventDefault()

    if (event.deltaY < 0) {
      // 向上滚动，放大
      this.scale /= this.zoomSpeed
    } else {
      // 向下滚动，缩小
      this.scale *= this.zoomSpeed
    }

    // 限制缩放范围
    this.scale = Math.max(0.1, Math.min(10, this.scale))

    // 应用缩放
    this.spherical.radius = this.spherical.radius * (this.scale / (this.scale + (event.deltaY < 0 ? -0.1 : 0.1)))
    this.spherical.radius = Math.max(1, Math.min(100, this.spherical.radius))

    this.updateCamera()
  }

  /**
   * 阻止右键菜单
   */
  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault()
  }

  /**
   * 销毁控制器
   */
  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown)
    this.domElement.removeEventListener('mousemove', this.onMouseMove)
    this.domElement.removeEventListener('mouseup', this.onMouseUp)
    this.domElement.removeEventListener('wheel', this.onWheel)
    this.domElement.removeEventListener('contextmenu', this.onContextMenu)
  }
}
