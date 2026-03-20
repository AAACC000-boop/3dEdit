import * as THREE from 'three'

export type GeometryType = 'box' | 'sphere' | 'cylinder'

export type TransformMode = 'translate' | 'rotate' | 'scale'

export interface SceneObjectData {
  id: string
  type: GeometryType
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: { x: number; y: number; z: number }
  color: string
}

export interface SceneData {
  objects: SceneObjectData[]
  lightEnabled: boolean
  cameraPosition: { x: number; y: number; z: number }
  cameraTarget: { x: number; y: number; z: number }
}

export interface SceneObject extends THREE.Mesh {
  userData: {
    id: string
    type: GeometryType
    isSceneObject: boolean
  }
}

export interface TransformTool {
  group: THREE.Group
  updatePosition: (position: THREE.Vector3) => void
  updateRotation: (rotation: THREE.Euler) => void
  updateScale: (scale: THREE.Vector3) => void
  dispose: () => void
}
