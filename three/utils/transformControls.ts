import * as THREE from 'three'
import { TransformMode } from '../types'

/**
 * 变换控制器类
 * 实现Move/Rotate/Scale三种变换工具，基于局部坐标
 */
export class TransformControls {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private domElement: HTMLElement
  private targetObject: THREE.Object3D | null = null
  private mode: TransformMode = TransformMode.Move
  private isDragging: boolean = false
  private activeAxis: string | null = null
  private mouse: THREE.Vector2 = new THREE.Vector2()
  private raycaster: THREE.Raycaster = new THREE.Raycaster()
  private onChangeCallback: (() => void) | null = null

  // 拖拽相关状态
  private dragStartPoint: THREE.Vector3 = new THREE.Vector3()
  private dragCurrentPoint: THREE.Vector3 = new THREE.Vector3()
  private startPosition: THREE.Vector3 = new THREE.Vector3()
  private startRotation: THREE.Euler = new THREE.Euler()
  private startScale: THREE.Vector3 = new THREE.Vector3()
  private startMouse: THREE.Vector2 = new THREE.Vector2()

  // Gizmo对象
  private gizmoGroup: THREE.Group = new THREE.Group()
  private moveGizmo: THREE.Group = new THREE.Group()
  private rotateGizmo: THREE.Group = new THREE.Group()
  private scaleGizmo: THREE.Group = new THREE.Group()

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.scene = scene
    this.camera = camera
    this.domElement = domElement

    // 创建Gizmo
    this.createGizmos()
    this.scene.add(this.gizmoGroup)

    // 绑定事件
    this.domElement.addEventListener('mousedown', this.onMouseDown)
    this.domElement.addEventListener('mousemove', this.onMouseMove)
    this.domElement.addEventListener('mouseup', this.onMouseUp)
  }

  /**
   * 创建所有Gizmo
   */
  private createGizmos(): void {
    this.createMoveGizmo()
    this.createRotateGizmo()
    this.createScaleGizmo()
    this.updateGizmoVisibility()
  }

  /**
   * 创建移动Gizmo（三轴箭头）
   */
  private createMoveGizmo(): void {
    const axisLength = 2
    const headLength = 0.4
    const headWidth = 0.2

    // X轴（红色）
    const xAxis = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      axisLength,
      0xff0000,
      headLength,
      headWidth
    )
    xAxis.userData.axis = 'x'
    this.moveGizmo.add(xAxis)

    // Y轴（绿色）
    const yAxis = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      axisLength,
      0x00ff00,
      headLength,
      headWidth
    )
    yAxis.userData.axis = 'y'
    this.moveGizmo.add(yAxis)

    // Z轴（蓝色）
    const zAxis = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      axisLength,
      0x0000ff,
      headLength,
      headWidth
    )
    zAxis.userData.axis = 'z'
    this.moveGizmo.add(zAxis)

    this.gizmoGroup.add(this.moveGizmo)
  }

  /**
   * 创建旋转Gizmo（三个圆环）
   */
  private createRotateGizmo(): void {
    const radius = 2
    const tube = 0.05
    const segments = 64

    // X轴圆环（红色）- 绕X轴旋转
    const xRing = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 8, segments),
      new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 })
    )
    xRing.rotation.y = Math.PI / 2
    xRing.userData.axis = 'x'
    this.rotateGizmo.add(xRing)

    // Y轴圆环（绿色）- 绕Y轴旋转
    const yRing = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 8, segments),
      new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 })
    )
    yRing.rotation.x = Math.PI / 2
    yRing.userData.axis = 'y'
    this.rotateGizmo.add(yRing)

    // Z轴圆环（蓝色）- 绕Z轴旋转
    const zRing = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 8, segments),
      new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.8 })
    )
    zRing.userData.axis = 'z'
    this.rotateGizmo.add(zRing)

    this.gizmoGroup.add(this.rotateGizmo)
  }

  /**
   * 创建缩放Gizmo（三轴方块）
   */
  private createScaleGizmo(): void {
    const axisLength = 2
    const boxSize = 0.3

    // 创建轴线和方块
    const axes = [
      { dir: new THREE.Vector3(1, 0, 0), color: 0xff0000, axis: 'x' },
      { dir: new THREE.Vector3(0, 1, 0), color: 0x00ff00, axis: 'y' },
      { dir: new THREE.Vector3(0, 0, 1), color: 0x0000ff, axis: 'z' }
    ]

    axes.forEach(({ dir, color, axis }) => {
      const group = new THREE.Group()

      // 轴线
      const line = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, axisLength, 8),
        new THREE.MeshBasicMaterial({ color })
      )
      line.position.copy(dir.clone().multiplyScalar(axisLength / 2))
      line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
      group.add(line)

      // 方块手柄
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(boxSize, boxSize, boxSize),
        new THREE.MeshBasicMaterial({ color })
      )
      box.position.copy(dir.clone().multiplyScalar(axisLength))
      box.userData.axis = axis
      group.add(box)

      group.userData.axis = axis
      this.scaleGizmo.add(group)
    })

    this.gizmoGroup.add(this.scaleGizmo)
  }

  /**
   * 更新Gizmo可见性
   */
  private updateGizmoVisibility(): void {
    this.moveGizmo.visible = this.mode === TransformMode.Move && this.targetObject !== null
    this.rotateGizmo.visible = this.mode === TransformMode.Rotate && this.targetObject !== null
    this.scaleGizmo.visible = this.mode === TransformMode.Scale && this.targetObject !== null
  }

  /**
   * 附加到目标对象
   */
  attach(object: THREE.Object3D | null): void {
    this.targetObject = object
    if (object) {
      this.gizmoGroup.position.copy(object.position)
      this.gizmoGroup.quaternion.copy(object.quaternion)
      this.gizmoGroup.scale.set(1, 1, 1)
    }
    this.updateGizmoVisibility()
  }

  /**
   * 设置变换模式
   */
  setMode(mode: TransformMode): void {
    this.mode = mode
    this.updateGizmoVisibility()
  }

  /**
   * 获取当前变换模式
   */
  getMode(): TransformMode {
    return this.mode
  }

  /**
   * 设置变换回调
   */
  setOnChangeCallback(callback: () => void): void {
    this.onChangeCallback = callback
  }

  /**
   * 获取当前激活的Gizmo组
   */
  private getActiveGizmo(): THREE.Group {
    switch (this.mode) {
      case TransformMode.Rotate:
        return this.rotateGizmo
      case TransformMode.Scale:
        return this.scaleGizmo
      default:
        return this.moveGizmo
    }
  }

  /**
   * 获取目标轴在世界空间中的方向
   */
  private getWorldAxis(): THREE.Vector3 {
    const axisMap: Record<string, THREE.Vector3> = {
      x: new THREE.Vector3(1, 0, 0),
      y: new THREE.Vector3(0, 1, 0),
      z: new THREE.Vector3(0, 0, 1)
    }
    const localAxis = axisMap[this.activeAxis!].clone()
    if (this.targetObject) {
      localAxis.transformDirection(this.targetObject.matrixWorld).normalize()
    }
    return localAxis
  }

  /**
   * 计算射线与平面的交点
   */
  private getRayPlaneIntersection(planeNormal: THREE.Vector3, planePoint: THREE.Vector3): THREE.Vector3 | null {
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint)
    const target = new THREE.Vector3()
    const result = this.raycaster.ray.intersectPlane(plane, target)
    return result ? target : null
  }

  /**
   * 鼠标按下事件
   */
  private onMouseDown = (event: MouseEvent): void => {
    if (!this.targetObject || event.button !== 0) return

    const rect = this.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.startMouse.copy(this.mouse)

    // 射线检测Gizmo
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const activeGizmo = this.getActiveGizmo()
    const intersects = this.raycaster.intersectObjects(activeGizmo.children, true)

    if (intersects.length > 0) {
      this.isDragging = true

      // 找到轴信息
      let obj: THREE.Object3D | null = intersects[0].object
      while (obj && !obj.userData.axis) {
        obj = obj.parent
      }
      this.activeAxis = obj?.userData.axis || null

      if (!this.activeAxis) return

      // 保存初始状态
      this.startPosition.copy(this.targetObject.position)
      this.startRotation.copy(this.targetObject.rotation)
      this.startScale.copy(this.targetObject.scale)

      // 获取物体世界位置
      const worldPosition = new THREE.Vector3()
      this.targetObject.getWorldPosition(worldPosition)

      // 计算拖拽起始点
      if (this.mode === TransformMode.Move) {
        // 平移：在与相机垂直的平面上投影
        const cameraDirection = new THREE.Vector3()
        this.camera.getWorldDirection(cameraDirection)
        const intersection = this.getRayPlaneIntersection(cameraDirection, worldPosition)
        if (intersection) {
          this.dragStartPoint.copy(intersection)
        }
      } else if (this.mode === TransformMode.Rotate) {
        // 旋转：记录起始鼠标位置和物体旋转
        this.dragStartPoint.copy(worldPosition)
      } else if (this.mode === TransformMode.Scale) {
        // 缩放：在与目标轴垂直的平面上投影
        const worldAxis = this.getWorldAxis()
        const intersection = this.getRayPlaneIntersection(worldAxis, worldPosition)
        if (intersection) {
          this.dragStartPoint.copy(intersection)
        }
      }
    }
  }

  /**
   * 鼠标移动事件
   */
  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging || !this.targetObject || !this.activeAxis) return

    const rect = this.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)

    const worldPosition = new THREE.Vector3()
    this.targetObject.getWorldPosition(worldPosition)

    switch (this.mode) {
      case TransformMode.Move:
        this.handleMove(worldPosition)
        break
      case TransformMode.Rotate:
        this.handleRotate()
        break
      case TransformMode.Scale:
        this.handleScale(worldPosition)
        break
    }

    // 更新Gizmo位置和旋转
    this.gizmoGroup.position.copy(this.targetObject.position)
    this.gizmoGroup.quaternion.copy(this.targetObject.quaternion)

    if (this.onChangeCallback) {
      this.onChangeCallback()
    }
  }

  /**
   * 处理平移
   * 将拖拽位移投影到目标轴上
   */
  private handleMove(worldPosition: THREE.Vector3): void {
    const cameraDirection = new THREE.Vector3()
    this.camera.getWorldDirection(cameraDirection)
    const intersection = this.getRayPlaneIntersection(cameraDirection, worldPosition)
    if (!intersection) return

    // 计算拖拽位移向量
    const delta = new THREE.Vector3().subVectors(intersection, this.dragStartPoint)

    // 获取目标轴的世界方向
    const worldAxis = this.getWorldAxis()

    // 将位移投影到目标轴上
    const projection = delta.dot(worldAxis)

    // 将投影长度转换回局部坐标系
    const localAxis = new THREE.Vector3(
      this.activeAxis === 'x' ? 1 : 0,
      this.activeAxis === 'y' ? 1 : 0,
      this.activeAxis === 'z' ? 1 : 0
    )

    // 计算新的位置
    const newPosition = this.startPosition.clone()
    newPosition.add(localAxis.multiplyScalar(projection))

    this.targetObject!.position.copy(newPosition)
  }

  /**
   * 处理旋转
   * 计算绕目标轴的角度增量
   */
  private handleRotate(): void {
    // 计算鼠标移动的屏幕空间增量
    const deltaX = this.mouse.x - this.startMouse.x
    const deltaY = this.mouse.y - this.startMouse.y

    // 根据轴确定旋转方向
    let angleDelta = 0
    const sensitivity = 5 // 调整灵敏度

    if (this.activeAxis === 'x') {
      // 绕X轴旋转：鼠标上下移动控制
      angleDelta = -deltaY * sensitivity
    } else if (this.activeAxis === 'y') {
      // 绕Y轴旋转：鼠标左右移动控制
      angleDelta = -deltaX * sensitivity
    } else if (this.activeAxis === 'z') {
      // 绕Z轴旋转：鼠标对角线移动控制
      angleDelta = (deltaX - deltaY) * sensitivity
    }

    // 应用旋转增量到初始旋转
    const newRotation = this.startRotation.clone()
    if (this.activeAxis === 'x') {
      newRotation.x += angleDelta
    } else if (this.activeAxis === 'y') {
      newRotation.y += angleDelta
    } else if (this.activeAxis === 'z') {
      newRotation.z += angleDelta
    }

    this.targetObject!.rotation.copy(newRotation)
  }

  /**
   * 处理缩放
   * 计算沿目标轴的标量增量
   */
  private handleScale(worldPosition: THREE.Vector3): void {
    const worldAxis = this.getWorldAxis()
    const intersection = this.getRayPlaneIntersection(worldAxis, worldPosition)
    if (!intersection) return

    // 计算拖拽向量在目标轴上的投影
    const dragVector = new THREE.Vector3().subVectors(intersection, worldPosition)
    const projection = dragVector.dot(worldAxis)

    // 计算缩放增量（基于投影距离）
    const sensitivity = 0.5
    let scaleDelta = 1 + projection * sensitivity

    // 限制最小缩放
    scaleDelta = Math.max(0.1, scaleDelta)

    // 应用缩放到对应轴
    const newScale = this.startScale.clone()
    if (this.activeAxis === 'x') {
      newScale.x *= scaleDelta
    } else if (this.activeAxis === 'y') {
      newScale.y *= scaleDelta
    } else if (this.activeAxis === 'z') {
      newScale.z *= scaleDelta
    }

    // 确保最小缩放值
    newScale.x = Math.max(0.01, newScale.x)
    newScale.y = Math.max(0.01, newScale.y)
    newScale.z = Math.max(0.01, newScale.z)

    this.targetObject!.scale.copy(newScale)
  }

  /**
   * 鼠标释放事件
   */
  private onMouseUp = (): void => {
    this.isDragging = false
    this.activeAxis = null
  }

  /**
   * 销毁控制器
   */
  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown)
    this.domElement.removeEventListener('mousemove', this.onMouseMove)
    this.domElement.removeEventListener('mouseup', this.onMouseUp)
    this.scene.remove(this.gizmoGroup)
  }
}
