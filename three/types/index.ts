import * as THREE from 'three'

/**
 * 几何体类型枚举
 */
export enum GeometryType {
  Box = 'box',
  Sphere = 'sphere',
  Cylinder = 'cylinder'
}

/**
 * 变换模式枚举
 */
export enum TransformMode {
  Move = 'move',
  Rotate = 'rotate',
  Scale = 'scale'
}

/**
 * 场景对象数据接口（用于序列化）
 */
export interface SceneObjectData {
  id: string
  type: GeometryType
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: { x: number; y: number; z: number }
  color: string
}

/**
 * 场景数据接口（用于序列化）
 */
export interface SceneData {
  version: string
  objects: SceneObjectData[]
}

/**
 * 编辑器状态接口
 */
export interface EditorState {
  selectedObject: THREE.Object3D | null
  transformMode: TransformMode
  isLightingEnabled: boolean
}
