import * as THREE from 'three'
import { SceneObject } from '../types'

export class SelectionManager {
  private camera: THREE.Camera
  private domElement: HTMLElement
  private raycaster: THREE.Raycaster
  private selectableObjects: () => SceneObject[]
  private onObjectSelected: (object: SceneObject | null) => void
  private isLeftClick: boolean = false

  constructor(
    camera: THREE.Camera,
    domElement: HTMLElement,
    getSelectableObjects: () => SceneObject[],
    onObjectSelected: (object: SceneObject | null) => void
  ) {
    this.camera = camera
    this.domElement = domElement
    this.raycaster = new THREE.Raycaster()
    this.selectableObjects = getSelectableObjects
    this.onObjectSelected = onObjectSelected

    this.bindEvents()
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this))
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this))
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      this.isLeftClick = true
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0 && this.isLeftClick) {
      this.isLeftClick = false
      this.handleClick(event)
    }
  }

  private handleClick(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )

    this.raycaster.setFromCamera(mouse, this.camera)

    const objects = this.selectableObjects()
    const intersects = this.raycaster.intersectObjects(objects, false)

    if (intersects.length > 0) {
      const selectedObject = intersects[0].object as SceneObject
      if (selectedObject.userData.isSceneObject) {
        this.onObjectSelected(selectedObject)
        return
      }
    }

    this.onObjectSelected(null)
  }

  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown.bind(this))
    this.domElement.removeEventListener('mouseup', this.onMouseUp.bind(this))
  }
}
