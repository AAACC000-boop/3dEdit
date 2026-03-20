import * as THREE from 'three'
import { SceneObject, GeometryType, SceneData, SceneObjectData } from '../types'

let objectIdCounter = 0

function generateObjectId(): string {
  return `object_${Date.now()}_${objectIdCounter++}`
}

export class SceneManager {
  private scene: THREE.Scene
  private objects: Map<string, SceneObject> = new Map()
  private selectedObject: SceneObject | null = null

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  createGeometry(type: GeometryType): THREE.BufferGeometry {
    switch (type) {
      case 'box':
        return new THREE.BoxGeometry(1, 1, 1)
      case 'sphere':
        return new THREE.SphereGeometry(0.5, 32, 32)
      case 'cylinder':
        return new THREE.CylinderGeometry(0.5, 0.5, 1, 32)
      default:
        throw new Error(`Unknown geometry type: ${type}`)
    }
  }

  addObject(type: GeometryType, position?: THREE.Vector3, color?: string): SceneObject {
    const geometry = this.createGeometry(type)
    const material = new THREE.MeshStandardMaterial({
      color: color || this.getRandomColor(),
      metalness: 0.3,
      roughness: 0.7
    })

    const mesh = new THREE.Mesh(geometry, material) as SceneObject
    const id = generateObjectId()

    mesh.userData = {
      id,
      type,
      isSceneObject: true
    }

    if (position) {
      mesh.position.copy(position)
    } else {
      mesh.position.set(
        (Math.random() - 0.5) * 4,
        0.5,
        (Math.random() - 0.5) * 4
      )
    }

    mesh.castShadow = true
    mesh.receiveShadow = true

    this.scene.add(mesh)
    this.objects.set(id, mesh)

    return mesh
  }

  removeObject(id: string): boolean {
    const object = this.objects.get(id)
    if (!object) return false

    if (this.selectedObject === object) {
      this.selectedObject = null
    }

    this.scene.remove(object)
    object.geometry.dispose()
    if (object.material instanceof THREE.Material) {
      object.material.dispose()
    }
    this.objects.delete(id)

    return true
  }

  getObject(id: string): SceneObject | undefined {
    return this.objects.get(id)
  }

  getAllObjects(): SceneObject[] {
    return Array.from(this.objects.values())
  }

  selectObject(object: SceneObject | null): void {
    if (this.selectedObject) {
      this.clearSelection()
    }

    this.selectedObject = object
    if (object && object.material instanceof THREE.MeshStandardMaterial) {
      object.material.emissive = new THREE.Color(0x333333)
    }
  }

  clearSelection(): void {
    if (this.selectedObject && this.selectedObject.material instanceof THREE.MeshStandardMaterial) {
      this.selectedObject.material.emissive = new THREE.Color(0x000000)
    }
    this.selectedObject = null
  }

  getSelectedObject(): SceneObject | null {
    return this.selectedObject
  }

  deleteSelected(): boolean {
    if (!this.selectedObject) return false
    const id = this.selectedObject.userData.id
    return this.removeObject(id)
  }

  private getRandomColor(): string {
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e']
    return colors[Math.floor(Math.random() * colors.length)]
  }

  serialize(): SceneData {
    const objects: SceneObjectData[] = []

    this.objects.forEach((obj) => {
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
    })

    return {
      objects,
      lightEnabled: true,
      cameraPosition: { x: 5, y: 5, z: 5 },
      cameraTarget: { x: 0, y: 0, z: 0 }
    }
  }

  deserialize(data: SceneData): void {
    this.clearAll()

    data.objects.forEach((objData) => {
      const obj = this.addObject(
        objData.type,
        new THREE.Vector3(objData.position.x, objData.position.y, objData.position.z),
        objData.color
      )
      obj.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z)
      obj.scale.set(objData.scale.x, objData.scale.y, objData.scale.z)
    })
  }

  clearAll(): void {
    this.selectedObject = null
    this.objects.forEach((obj) => {
      this.scene.remove(obj)
      obj.geometry.dispose()
      if (obj.material instanceof THREE.Material) {
        obj.material.dispose()
      }
    })
    this.objects.clear()
  }
}
