import * as THREE from 'three';
import { GeometryFactory } from './GeometryFactory';

interface SceneObjectData {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: number;
}

interface SceneData {
  objects: SceneObjectData[];
  lights: { [key: string]: boolean };
  gridVisible: boolean;
}

/**
 * 场景序列化器 - 负责场景的导出和恢复
 */
export class SceneSerializer {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public exportScene(): string {
    const sceneData: SceneData = {
      objects: [],
      lights: {},
      gridVisible: false
    };

    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.type) {
        const material = child.material as THREE.MeshStandardMaterial;
        const objectData: SceneObjectData = {
          id: child.userData.id,
          type: child.userData.type,
          position: {
            x: child.position.x,
            y: child.position.y,
            z: child.position.z
          },
          rotation: {
            x: child.rotation.x,
            y: child.rotation.y,
            z: child.rotation.z
          },
          scale: {
            x: child.scale.x,
            y: child.scale.y,
            z: child.scale.z
          },
          color: material.color.getHex()
        };
        sceneData.objects.push(objectData);
      }

      if (child instanceof THREE.Light) {
        sceneData.lights[child.type] = child.visible;
      }

      if (child instanceof THREE.GridHelper) {
        sceneData.gridVisible = child.visible;
      }
    });

    return JSON.stringify(sceneData, null, 2);
  }

  public importScene(jsonData: string): THREE.Mesh[] {
    const sceneData: SceneData = JSON.parse(jsonData);
    const importedObjects: THREE.Mesh[] = [];

    this.clearSceneObjects();

    sceneData.objects.forEach((objectData) => {
      let mesh: THREE.Mesh | null = null;

      switch (objectData.type) {
        case 'Box':
          mesh = GeometryFactory.createBox();
          break;
        case 'Sphere':
          mesh = GeometryFactory.createSphere();
          break;
        case 'Cylinder':
          mesh = GeometryFactory.createCylinder();
          break;
      }

      if (mesh) {
        mesh.position.set(objectData.position.x, objectData.position.y, objectData.position.z);
        mesh.rotation.set(objectData.rotation.x, objectData.rotation.y, objectData.rotation.z);
        mesh.scale.set(objectData.scale.x, objectData.scale.y, objectData.scale.z);

        const material = mesh.material as THREE.MeshStandardMaterial;
        material.color.setHex(objectData.color);

        mesh.userData.id = objectData.id;
        this.scene.add(mesh);
        importedObjects.push(mesh);
      }
    });

    return importedObjects;
  }

  private clearSceneObjects(): void {
    const objectsToRemove: THREE.Object3D[] = [];
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.type) {
        objectsToRemove.push(child);
      }
    });

    objectsToRemove.forEach((object) => {
      this.scene.remove(object);
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        }
      }
    });
  }
}
