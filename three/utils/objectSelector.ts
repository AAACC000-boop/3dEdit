import * as THREE from 'three'

/**
 * 对象选择器类
 * 处理鼠标点击选中物体的逻辑
 */
export class ObjectSelector {
  private camera: THREE.PerspectiveCamera
  private domElement: HTMLElement
  private raycaster: THREE.Raycaster = new THREE.Raycaster()
  private mouse: THREE.Vector2 = new THREE.Vector2()
  private selectedObject: THREE.Object3D | null = null
  private onSelectCallback: ((object: THREE.Object3D | null) => void) | null = null
  private selectionBox: THREE.BoxHelper | null = null
  private scene: THREE.Scene

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, scene: THREE.Scene) {
    this.camera = camera
    this.domElement = domElement
    this.scene = scene

    // 绑定点击事件
    this.domElement.addEventListener('click', this.onClick)
  }

  /**
   * 设置选中回调函数
   */
  setOnSelectCallback(callback: (object: THREE.Object3D | null) => void): void {
    this.onSelectCallback = callback
  }

  /**
   * 点击事件处理
   */
  private onClick = (event: MouseEvent): void => {
    // 忽略右键点击
    if (event.button !== 0) return

    // 计算鼠标在归一化设备坐标中的位置
    const rect = this.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    // 射线检测
    this.raycaster.setFromCamera(this.mouse, this.camera)

    // 获取所有可选择的对象
    const selectableObjects: THREE.Object3D[] = []
    this.scene.traverse((object) => {
      if (object.userData.isSelectable) {
        selectableObjects.push(object)
      }
    })

    const intersects = this.raycaster.intersectObjects(selectableObjects, false)

    if (intersects.length > 0) {
      // 选中第一个相交的物体
      const object = intersects[0].object
      this.select(object)
    } else {
      // 点击空白处，取消选中
      this.deselect()
    }
  }

  /**
   * 选中物体
   */
  select(object: THREE.Object3D): void {
    // 如果已选中同一物体，不做处理
    if (this.selectedObject === object) return

    // 先取消之前的选中
    this.deselect()

    this.selectedObject = object

    // 创建选中框
    this.selectionBox = new THREE.BoxHelper(object as THREE.Mesh, 0xffff00)
    this.scene.add(this.selectionBox)

    // 调用回调
    if (this.onSelectCallback) {
      this.onSelectCallback(object)
    }
  }

  /**
   * 取消选中
   */
  deselect(): void {
    if (this.selectionBox) {
      this.scene.remove(this.selectionBox)
      this.selectionBox.dispose()
      this.selectionBox = null
    }

    this.selectedObject = null

    if (this.onSelectCallback) {
      this.onSelectCallback(null)
    }
  }

  /**
   * 获取当前选中的物体
   */
  getSelectedObject(): THREE.Object3D | null {
    return this.selectedObject
  }

  /**
   * 更新选中框（在物体变换后调用）
   */
  updateSelectionBox(): void {
    if (this.selectionBox && this.selectedObject) {
      this.selectionBox.update()
    }
  }

  /**
   * 销毁选择器
   */
  dispose(): void {
    this.domElement.removeEventListener('click', this.onClick)
    this.deselect()
  }
}
