import * as THREE from 'three';

/**
 * 几何体工厂 - 负责创建基础几何体
 */
export class GeometryFactory {
  private static material = new THREE.MeshStandardMaterial({
    color: 0x4a90e2,
    metalness: 0.3,
    roughness: 0.7
  });

  public static createBox(width: number = 2, height: number = 2, depth: number = 2): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geometry, this.material.clone());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { type: 'Box', id: this.generateId() };
    return mesh;
  }

  public static createSphere(radius: number = 1, segments: number = 32): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    const mesh = new THREE.Mesh(geometry, this.material.clone());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { type: 'Sphere', id: this.generateId() };
    return mesh;
  }

  public static createCylinder(radiusTop: number = 1, radiusBottom: number = 1, height: number = 2, segments: number = 32): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
    const mesh = new THREE.Mesh(geometry, this.material.clone());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { type: 'Cylinder', id: this.generateId() };
    return mesh;
  }

  private static generateId(): string {
    return 'obj_' + Math.random().toString(36).substr(2, 9);
  }

  public static setMaterialColor(color: number): void {
    this.material.color.setHex(color);
  }
}
