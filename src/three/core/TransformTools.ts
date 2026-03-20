import * as THREE from 'three'
import { TransformMode, TransformTool } from '../types'

export class TransformTools {
  private scene: THREE.Scene
  private camera: THREE.Camera
  private domElement: HTMLElement
  private currentTool: TransformTool | null = null
  private currentMode: TransformMode = 'translate'
  private targetObject: THREE.Object3D | null = null
  private isDragging: boolean = false
  private activeAxis: string | null = null
  private dragPlane: THREE.Plane
  private dragStartPosition: THREE.Vector3
  private dragStartRotation: THREE.Euler
  private dragStartScale: THREE.Vector3
  private dragStartPoint: THREE.Vector3
  private dragStartMouse: THREE.Vector2
  private onTransformChange: (() => void) | null = null

  constructor(scene: THREE.Scene, camera: THREE.Camera, domElement: HTMLElement) {
    this.scene = scene
    this.camera = camera
    this.domElement = domElement
    this.dragPlane = new THREE.Plane()
    this.dragStartPosition = new THREE.Vector3()
    this.dragStartRotation = new THREE.Euler()
    this.dragStartScale = new THREE.Vector3()
    this.dragStartPoint = new THREE.Vector3()
    this.dragStartMouse = new THREE.Vector2()
  }

  setMode(mode: TransformMode): void {
    this.currentMode = mode
    if (this.targetObject) {
      this.updateTool()
    }
  }

  getMode(): TransformMode {
    return this.currentMode
  }

  attach(object: THREE.Object3D, onTransform?: () => void): void {
    this.detach()
    this.targetObject = object
    this.onTransformChange = onTransform || null
    this.createTool()
    this.bindEvents()
  }

  detach(): void {
    if (this.currentTool) {
      this.currentTool.dispose()
      this.currentTool = null
    }
    this.targetObject = null
    this.onTransformChange = null
    this.unbindEvents()
  }

  private createTool(): void {
    if (!this.targetObject) return

    switch (this.currentMode) {
      case 'translate':
        this.currentTool = this.createTranslateTool()
        break
      case 'rotate':
        this.currentTool = this.createRotateTool()
        break
      case 'scale':
        this.currentTool = this.createScaleTool()
        break
    }

    if (this.currentTool) {
      this.scene.add(this.currentTool.group)
      this.updateToolTransform()
    }
  }

  private createTranslateTool(): TransformTool {
    const group = new THREE.Group()
    const axisLength = 1.2
    const headLength = 0.3
    const headRadius = 0.08
    const lineRadius = 0.02

    const axes = [
      { color: 0xff0000, axis: 'x' },
      { color: 0x00ff00, axis: 'y' },
      { color: 0x0000ff, axis: 'z' }
    ]

    axes.forEach(({ color, axis }) => {
      const arrowGroup = new THREE.Group()
      arrowGroup.userData.axis = axis

      const lineGeometry = new THREE.CylinderGeometry(lineRadius, lineRadius, axisLength - headLength, 8)
      const lineMaterial = new THREE.MeshBasicMaterial({ color, depthTest: false })
      const line = new THREE.Mesh(lineGeometry, lineMaterial)
      line.position.y = (axisLength - headLength) / 2
      arrowGroup.add(line)

      const headGeometry = new THREE.ConeGeometry(headRadius, headLength, 12)
      const headMaterial = new THREE.MeshBasicMaterial({ color, depthTest: false })
      const head = new THREE.Mesh(headGeometry, headMaterial)
      head.position.y = axisLength - headLength / 2
      arrowGroup.add(head)

      if (axis === 'x') {
        arrowGroup.rotation.z = -Math.PI / 2
      } else if (axis === 'z') {
        arrowGroup.rotation.x = Math.PI / 2
      }

      group.add(arrowGroup)
    })

    return {
      group,
      updatePosition: (pos: THREE.Vector3) => { group.position.copy(pos) },
      updateRotation: () => { },
      updateScale: () => { },
      dispose: () => {
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            if (child.material instanceof THREE.Material) {
              child.material.dispose()
            }
          }
        })
        this.scene.remove(group)
      }
    }
  }

  private createRotateTool(): TransformTool {
    const group = new THREE.Group()
    const radius = 1

    const axes = [
      { color: 0xff0000, axis: 'x' },
      { color: 0x00ff00, axis: 'y' },
      { color: 0x0000ff, axis: 'z' }
    ]

    axes.forEach(({ color, axis }) => {
      const ringGroup = new THREE.Group()
      ringGroup.userData.axis = axis

      const ringGeometry = new THREE.TorusGeometry(radius, 0.02, 8, 48)
      const ringMaterial = new THREE.MeshBasicMaterial({ color, depthTest: false, side: THREE.DoubleSide })
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ringGroup.add(ring)

      if (axis === 'x') {
        ringGroup.rotation.y = Math.PI / 2
      } else if (axis === 'z') {
        ringGroup.rotation.x = Math.PI / 2
      }

      group.add(ringGroup)
    })

    return {
      group,
      updatePosition: (pos: THREE.Vector3) => { group.position.copy(pos) },
      updateRotation: () => { },
      updateScale: () => { },
      dispose: () => {
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            if (child.material instanceof THREE.Material) {
              child.material.dispose()
            }
          }
        })
        this.scene.remove(group)
      }
    }
  }

  private createScaleTool(): TransformTool {
    const group = new THREE.Group()
    const axisLength = 1.2
    const boxSize = 0.12
    const lineRadius = 0.02

    const axes = [
      { color: 0xff0000, axis: 'x' },
      { color: 0x00ff00, axis: 'y' },
      { color: 0x0000ff, axis: 'z' }
    ]

    axes.forEach(({ color, axis }) => {
      const axisGroup = new THREE.Group()
      axisGroup.userData.axis = axis

      const lineGeometry = new THREE.CylinderGeometry(lineRadius, lineRadius, axisLength - boxSize, 8)
      const lineMaterial = new THREE.MeshBasicMaterial({ color, depthTest: false })
      const line = new THREE.Mesh(lineGeometry, lineMaterial)
      line.position.y = (axisLength - boxSize) / 2
      axisGroup.add(line)

      const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize)
      const boxMaterial = new THREE.MeshBasicMaterial({ color, depthTest: false })
      const box = new THREE.Mesh(boxGeometry, boxMaterial)
      box.position.y = axisLength - boxSize / 2
      axisGroup.add(box)

      if (axis === 'x') {
        axisGroup.rotation.z = -Math.PI / 2
      } else if (axis === 'z') {
        axisGroup.rotation.x = Math.PI / 2
      }

      group.add(axisGroup)
    })

    return {
      group,
      updatePosition: (pos: THREE.Vector3) => { group.position.copy(pos) },
      updateRotation: () => { },
      updateScale: () => { },
      dispose: () => {
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            if (child.material instanceof THREE.Material) {
              child.material.dispose()
            }
          }
        })
        this.scene.remove(group)
      }
    }
  }

  private updateTool(): void {
    if (this.currentTool) {
      this.currentTool.dispose()
      this.currentTool = null
    }
    this.createTool()
  }

  private updateToolTransform(): void {
    if (!this.currentTool || !this.targetObject) return

    this.currentTool.group.position.copy(this.targetObject.position)
    this.currentTool.group.rotation.copy(this.targetObject.rotation)
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown)
    this.domElement.addEventListener('mousemove', this.onMouseMove)
    this.domElement.addEventListener('mouseup', this.onMouseUp)
  }

  private unbindEvents(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown)
    this.domElement.removeEventListener('mousemove', this.onMouseMove)
    this.domElement.removeEventListener('mouseup', this.onMouseUp)
  }

  private onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0 || !this.currentTool) return

    const axis = this.getAxisUnderMouse(event)
    if (!axis) return

    this.isDragging = true
    this.activeAxis = axis

    this.dragStartPosition.copy(this.targetObject!.position)
    this.dragStartRotation.copy(this.targetObject!.rotation)
    this.dragStartScale.copy(this.targetObject!.scale)

    this.setupDragPlane(axis)

    const point = this.getPlaneIntersection(event)
    if (point) {
      this.dragStartPoint.copy(point)
    }

    const rect = this.domElement.getBoundingClientRect()
    this.dragStartMouse.set(
      event.clientX - rect.left,
      event.clientY - rect.top
    )

    this.domElement.style.cursor = 'grabbing'
    event.stopPropagation()
  }

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging || !this.targetObject || !this.activeAxis) return

    const rect = this.domElement.getBoundingClientRect()
    const currentMouse = new THREE.Vector2(
      event.clientX - rect.left,
      event.clientY - rect.top
    )

    const currentPoint = this.getPlaneIntersection(event)
    if (!currentPoint) return

    switch (this.currentMode) {
      case 'translate':
        this.applyTranslate(currentPoint)
        break
      case 'rotate':
        this.applyRotate(currentPoint, currentMouse)
        break
      case 'scale':
        this.applyScale(currentPoint)
        break
    }

    this.updateToolTransform()

    if (this.onTransformChange) {
      this.onTransformChange()
    }
  }

  private onMouseUp = (): void => {
    this.isDragging = false
    this.activeAxis = null
    this.domElement.style.cursor = 'default'
  }

  private getAxisUnderMouse(event: MouseEvent): string | null {
    if (!this.currentTool) return null

    const rect = this.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, this.camera)

    const intersects = raycaster.intersectObjects(this.currentTool.group.children, true)

    if (intersects.length > 0) {
      let parent = intersects[0].object.parent
      while (parent) {
        if (parent.userData.axis) {
          return parent.userData.axis
        }
        parent = parent.parent
      }
    }

    return null
  }

  private getLocalAxisDirection(axis: string): THREE.Vector3 {
    const localDir = new THREE.Vector3()
    switch (axis) {
      case 'x':
        localDir.set(1, 0, 0)
        break
      case 'y':
        localDir.set(0, 1, 0)
        break
      case 'z':
        localDir.set(0, 0, 1)
        break
    }
    return localDir.applyQuaternion(this.targetObject!.quaternion)
  }

  private setupDragPlane(axis: string): void {
    if (!this.targetObject) return

    const cameraDirection = new THREE.Vector3()
    this.camera.getWorldDirection(cameraDirection)

    const axisDirection = this.getLocalAxisDirection(axis)

    const normal = new THREE.Vector3()
    if (this.currentMode === 'rotate') {
      normal.copy(axisDirection)
    } else {
      normal.crossVectors(cameraDirection, axisDirection).normalize()
      if (normal.lengthSq() < 0.001) {
        normal.copy(cameraDirection)
      }
      normal.cross(axisDirection).normalize()
    }

    this.dragPlane.setFromNormalAndCoplanarPoint(normal, this.targetObject.position)
  }

  private getPlaneIntersection(event: MouseEvent): THREE.Vector3 | null {
    if (!this.targetObject) return null

    const rect = this.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, this.camera)

    const intersection = new THREE.Vector3()
    raycaster.ray.intersectPlane(this.dragPlane, intersection)

    return intersection
  }

  private applyTranslate(currentPoint: THREE.Vector3): void {
    if (!this.targetObject || !this.activeAxis) return

    const axisDirection = this.getLocalAxisDirection(this.activeAxis)

    const delta = currentPoint.clone().sub(this.dragStartPoint)

    const projection = delta.dot(axisDirection)

    const newPosition = this.dragStartPosition.clone().add(axisDirection.multiplyScalar(projection))
    this.targetObject.position.copy(newPosition)
  }

  private applyRotate(currentPoint: THREE.Vector3, currentMouse: THREE.Vector2): void {
    if (!this.targetObject || !this.activeAxis) return

    const center = this.targetObject.position.clone()

    const startVec = this.dragStartPoint.clone().sub(center)
    const currentVec = currentPoint.clone().sub(center)

    const axisDirection = this.getLocalAxisDirection(this.activeAxis)

    const startProjected = startVec.clone().sub(axisDirection.clone().multiplyScalar(startVec.dot(axisDirection)))
    const currentProjected = currentVec.clone().sub(axisDirection.clone().multiplyScalar(currentVec.dot(axisDirection)))

    if (startProjected.lengthSq() < 0.001 || currentProjected.lengthSq() < 0.001) return

    startProjected.normalize()
    currentProjected.normalize()

    let angle = Math.acos(Math.max(-1, Math.min(1, startProjected.dot(currentProjected))))

    const cross = new THREE.Vector3().crossVectors(startProjected, currentProjected)
    if (cross.dot(axisDirection) < 0) {
      angle = -angle
    }

    const quaternion = new THREE.Quaternion().setFromAxisAngle(axisDirection, angle)
    const startQuat = new THREE.Quaternion().setFromEuler(this.dragStartRotation)
    const newQuat = quaternion.multiply(startQuat)
    this.targetObject.quaternion.copy(newQuat)
  }

  private applyScale(currentPoint: THREE.Vector3): void {
    if (!this.targetObject || !this.activeAxis) return

    const axisDirection = this.getLocalAxisDirection(this.activeAxis)

    const delta = currentPoint.clone().sub(this.dragStartPoint)

    const projection = delta.dot(axisDirection)

    const scaleFactor = 1 + projection * 0.5

    const newScale = this.dragStartScale.clone()
    switch (this.activeAxis) {
      case 'x':
        newScale.x = Math.max(0.1, this.dragStartScale.x * scaleFactor)
        break
      case 'y':
        newScale.y = Math.max(0.1, this.dragStartScale.y * scaleFactor)
        break
      case 'z':
        newScale.z = Math.max(0.1, this.dragStartScale.z * scaleFactor)
        break
    }

    this.targetObject.scale.copy(newScale)
  }

  dispose(): void {
    this.detach()
  }
}
