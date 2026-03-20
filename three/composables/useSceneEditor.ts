import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { SceneManager } from '../utils/sceneManager'
import { CameraController } from '../utils/cameraController'
import { ObjectSelector } from '../utils/objectSelector'
import { TransformControls } from '../utils/transformControls'
import { GeometryType, TransformMode, type SceneData } from '../types'

/**
 * 场景编辑器组合式函数
 * 整合所有编辑器功能，提供简洁的API给Vue组件使用
 */
export function useSceneEditor() {
  const containerRef = ref<HTMLElement | null>(null)
  const selectedObject = ref<THREE.Object3D | null>(null)
  const transformMode = ref<TransformMode>(TransformMode.Move)
  const isLightingEnabled = ref(true)

  let sceneManager: SceneManager | null = null
  let cameraController: CameraController | null = null
  let objectSelector: ObjectSelector | null = null
  let transformControls: TransformControls | null = null

  /**
   * 初始化编辑器
   */
  const initEditor = () => {
    if (!containerRef.value) return

    // 初始化场景管理器
    sceneManager = new SceneManager(containerRef.value)

    // 初始化相机控制器
    cameraController = new CameraController(
      sceneManager.getCamera(),
      sceneManager.getRendererDomElement()
    )

    // 初始化对象选择器
    objectSelector = new ObjectSelector(
      sceneManager.getCamera(),
      sceneManager.getRendererDomElement(),
      sceneManager.getScene()
    )
    objectSelector.setOnSelectCallback((object) => {
      selectedObject.value = object
      if (transformControls) {
        transformControls.attach(object)
      }
    })

    // 初始化变换控制器
    transformControls = new TransformControls(
      sceneManager.getScene(),
      sceneManager.getCamera(),
      sceneManager.getRendererDomElement()
    )
    transformControls.setOnChangeCallback(() => {
      if (objectSelector) {
        objectSelector.updateSelectionBox()
      }
    })
  }

  /**
   * 清理编辑器资源
   */
  const disposeEditor = () => {
    transformControls?.dispose()
    objectSelector?.dispose()
    cameraController?.dispose()
    sceneManager?.dispose()
  }

  /**
   * 添加几何体
   */
  const addGeometry = (type: GeometryType) => {
    if (!sceneManager) return

    const mesh = sceneManager.createGeometry(type)
    mesh.position.set(
      (Math.random() - 0.5) * 5,
      1,
      (Math.random() - 0.5) * 5
    )
    sceneManager.addObject(mesh)
  }

  /**
   * 删除选中的物体
   */
  const deleteSelected = () => {
    if (!sceneManager || !selectedObject.value) return

    sceneManager.removeObject(selectedObject.value)
    selectedObject.value = null
    transformControls?.attach(null)
  }

  /**
   * 设置变换模式
   */
  const setTransformMode = (mode: TransformMode) => {
    transformMode.value = mode
    transformControls?.setMode(mode)
  }

  /**
   * 切换灯光
   */
  const toggleLighting = () => {
    isLightingEnabled.value = !isLightingEnabled.value
    sceneManager?.toggleLighting(isLightingEnabled.value)
  }

  /**
   * 导出场景
   */
  const exportScene = (): string => {
    if (!sceneManager) return ''
    const data = sceneManager.exportScene()
    return JSON.stringify(data, null, 2)
  }

  /**
   * 导入场景
   */
  const importScene = (jsonString: string) => {
    if (!sceneManager) return

    try {
      const data: SceneData = JSON.parse(jsonString)
      sceneManager.importScene(data)
      selectedObject.value = null
      transformControls?.attach(null)
    } catch (error) {
      console.error('Failed to import scene:', error)
      alert('Invalid scene data')
    }
  }

  onMounted(initEditor)
  onUnmounted(disposeEditor)

  return {
    containerRef,
    selectedObject,
    transformMode,
    isLightingEnabled,
    addGeometry,
    deleteSelected,
    setTransformMode,
    toggleLighting,
    exportScene,
    importScene
  }
}
