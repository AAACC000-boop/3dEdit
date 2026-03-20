import * as THREE from 'three'
import { SceneManager, CameraController, LightManager, SelectionManager, TransformTools } from './core'
import { SceneObject, GeometryType, TransformMode, SceneData } from './types'

export interface SceneEditorOptions {
  container: HTMLElement
}

export class SceneEditor {
  private container: HTMLElement
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private sceneManager: SceneManager
  private cameraController: CameraController
  private lightManager: LightManager
  private selectionManager: SelectionManager
  private transformTools: TransformTools
  private animationId: number | null = null
  private gridHelper: THREE.GridHelper

  constructor(options: SceneEditorOptions) {
    this.container = options.container

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)

    const aspect = this.container.clientWidth / this.container.clientHeight
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000)
    this.camera.position.set(5, 5, 5)
    this.camera.lookAt(0, 0, 0)

    this.sceneManager = new SceneManager(this.scene)

    this.cameraController = new CameraController(this.camera, this.renderer.domElement)

    this.lightManager = new LightManager(this.scene)

    this.gridHelper = new THREE.GridHelper(20, 20, 0x444466, 0x333355)
    this.scene.add(this.gridHelper)

    this.transformTools = new TransformTools(this.scene, this.camera, this.renderer.domElement)

    this.selectionManager = new SelectionManager(
      this.camera,
      this.renderer.domElement,
      () => this.sceneManager.getAllObjects(),
      this.handleObjectSelected.bind(this)
    )

    window.addEventListener('resize', this.handleResize.bind(this))

    this.startRenderLoop()
  }

  private handleObjectSelected(object: SceneObject | null): void {
    if (object) {
      this.sceneManager.selectObject(object)
      this.transformTools.attach(object)
    } else {
      this.sceneManager.clearSelection()
      this.transformTools.detach()
    }
  }

  private handleResize(): void {
    const width = this.container.clientWidth
    const height = this.container.clientHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(width, height)
  }

  private startRenderLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate)
      this.renderer.render(this.scene, this.camera)
    }
    animate()
  }

  addGeometry(type: GeometryType): SceneObject | null {
    const object = this.sceneManager.addObject(type)
    return object
  }

  deleteSelected(): boolean {
    const selected = this.sceneManager.getSelectedObject()
    if (selected) {
      this.transformTools.detach()
      return this.sceneManager.deleteSelected()
    }
    return false
  }

  setTransformMode(mode: TransformMode): void {
    this.transformTools.setMode(mode)
  }

  getTransformMode(): TransformMode {
    return this.transformTools.getMode()
  }

  toggleLight(): boolean {
    return this.lightManager.toggle()
  }

  isLightEnabled(): boolean {
    return this.lightManager.isEnabled()
  }

  getSelectedObject(): SceneObject | null {
    return this.sceneManager.getSelectedObject()
  }

  getAllObjects(): SceneObject[] {
    return this.sceneManager.getAllObjects()
  }

  exportScene(): SceneData {
    return this.sceneManager.serialize()
  }

  importScene(data: SceneData): void {
    this.transformTools.detach()
    this.sceneManager.deserialize(data)
  }

  clearScene(): void {
    this.transformTools.detach()
    this.sceneManager.clearAll()
  }

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
    }

    window.removeEventListener('resize', this.handleResize.bind(this))

    this.selectionManager.dispose()
    this.transformTools.dispose()
    this.cameraController.dispose()
    this.lightManager.dispose()

    this.scene.remove(this.gridHelper)

    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}
