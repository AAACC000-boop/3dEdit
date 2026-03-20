import * as THREE from 'three'
import { GeometryType, type SceneObjectData, type SceneData } from '../types'

/**
 * 场景管理器类
 * 负责管理Three.js场景、相机、渲染器、灯光等核心元素
 */
export class SceneManager {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private container: HTMLElement
  private animationId: number = 0
  private gridHelper: THREE.GridHelper
  private ambientLight: THREE.AmbientLight
  private directionalLight: THREE.DirectionalLight
  private objects: Map<string, THREE.Object3D> = new Map()

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)

    // 初始化透视相机
    const aspect = container.clientWidth / container.clientHeight
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000)
    this.camera.position.set(10, 10, 10)
    this.camera.lookAt(0, 0, 0)

    // 初始化WebGL渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    // 创建网格地面
    this.gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222)
    this.scene.add(this.gridHelper)

    // 创建环境光
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(this.ambientLight)

    // 创建平行光（主光源）
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    this.directionalLight.position.set(10, 20, 10)
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.width = 2048
    this.directionalLight.shadow.mapSize.height = 2048
    this.scene.add(this.directionalLight)

    // 启动渲染循环
    this.startRenderLoop()

    // 监听窗口大小变化
    window.addEventListener('resize', this.handleResize)
  }

  /**
   * 启动渲染循环
   */
  private startRenderLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate)
      this.renderer.render(this.scene, this.camera)
    }
    animate()
  }

  /**
   * 处理窗口大小变化
   */
  private handleResize = (): void => {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  /**
   * 获取场景
   */
  getScene(): THREE.Scene {
    return this.scene
  }

  /**
   * 获取相机
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera
  }

  /**
   * 获取渲染器DOM元素
   */
  getRendererDomElement(): HTMLCanvasElement {
    return this.renderer.domElement
  }

  /**
   * 切换灯光开关
   */
  toggleLighting(enabled: boolean): void {
    this.ambientLight.visible = enabled
    this.directionalLight.visible = enabled
  }

  /**
   * 创建几何体
   */
  createGeometry(type: GeometryType, color: number = 0x3b82f6): THREE.Mesh {
    let geometry: THREE.BufferGeometry

    switch (type) {
      case GeometryType.Box:
        geometry = new THREE.BoxGeometry(2, 2, 2)
        break
      case GeometryType.Sphere:
        geometry = new THREE.SphereGeometry(1.5, 32, 16)
        break
      case GeometryType.Cylinder:
        geometry = new THREE.CylinderGeometry(1, 1, 3, 32)
        break
      default:
        geometry = new THREE.BoxGeometry(2, 2, 2)
    }

    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      metalness: 0.1
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData.id = crypto.randomUUID()
    mesh.userData.type = type
    mesh.userData.isSelectable = true

    return mesh
  }

  /**
   * 添加对象到场景
   */
  addObject(object: THREE.Object3D): void {
    this.scene.add(object)
    if (object.userData.id) {
      this.objects.set(object.userData.id, object)
    }
  }

  /**
   * 从场景中移除对象
   */
  removeObject(object: THREE.Object3D): void {
    this.scene.remove(object)
    if (object.userData.id) {
      this.objects.delete(object.userData.id)
    }
    // 清理资源
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose()
      if (Array.isArray(object.material)) {
        object.material.forEach(m => m.dispose())
      } else {
        object.material.dispose()
      }
    }
  }

  /**
   * 根据ID获取对象
   */
  getObjectById(id: string): THREE.Object3D | undefined {
    return this.objects.get(id)
  }

  /**
   * 获取所有可选择的对象
   */
  getSelectableObjects(): THREE.Object3D[] {
    const selectable: THREE.Object3D[] = []
    this.scene.traverse((object) => {
      if (object.userData.isSelectable) {
        selectable.push(object)
      }
    })
    return selectable
  }

  /**
   * 导出场景数据
   */
  exportScene(): SceneData {
    const objects: SceneObjectData[] = []
    this.objects.forEach((obj) => {
      if (obj instanceof THREE.Mesh) {
        const material = obj.material as THREE.MeshStandardMaterial
        objects.push({
          id: obj.userData.id,
          type: obj.userData.type,
          position: {
            x: obj.position.x,
            y: obj.position.y,
            z: obj.position.z
          },
          rotation: {
            x: obj.rotation.x,
            y: obj.rotation.y,
            z: obj.rotation.z
          },
          scale: {
            x: obj.scale.x,
            y: obj.scale.y,
            z: obj.scale.z
          },
          color: '#' + material.color.getHexString()
        })
      }
    })

    return {
      version: '1.0.0',
      objects
    }
  }

  /**
   * 导入场景数据
   */
  importScene(data: SceneData): void {
    // 清除现有对象
    this.objects.forEach((obj) => {
      this.removeObject(obj)
    })

    // 创建新对象
    data.objects.forEach((objData) => {
      const color = parseInt(objData.color.replace('#', '0x'))
      const mesh = this.createGeometry(objData.type, color)
      mesh.userData.id = objData.id
      mesh.position.set(objData.position.x, objData.position.y, objData.position.z)
      mesh.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z)
      mesh.scale.set(objData.scale.x, objData.scale.y, objData.scale.z)
      this.addObject(mesh)
    })
  }

  /**
   * 销毁场景管理器
   */
  dispose(): void {
    cancelAnimationFrame(this.animationId)
    window.removeEventListener('resize', this.handleResize)
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}
