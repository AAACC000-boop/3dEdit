import * as THREE from 'three';

/**
 * 选择管理器 - 负责物体的选择和视觉反馈
 */
export class SelectionManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedObject: THREE.Mesh | null = null;
  private outlineMaterial: THREE.MeshBasicMaterial;
  private onSelectCallback: ((object: THREE.Mesh | null) => void) | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      side: THREE.BackSide
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', this.handleClick.bind(this));
  }

  private handleClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = this.getSelectableMeshes();
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object as THREE.Mesh;
      this.selectObject(clickedObject);
    } else {
      this.deselectObject();
    }
  }

  private getSelectableMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.type) {
        meshes.push(child);
      }
    });
    return meshes;
  }

  private selectObject(object: THREE.Mesh): void {
    if (this.selectedObject === object) return;

    this.deselectObject();
    this.selectedObject = object;

    const outline = new THREE.Mesh(
      object.geometry,
      this.outlineMaterial
    );
    outline.scale.multiplyScalar(1.05);
    outline.userData.isOutline = true;
    object.add(outline);

    if (this.onSelectCallback) {
      this.onSelectCallback(object);
    }
  }

  private deselectObject(): void {
    if (this.selectedObject) {
      const outline = this.selectedObject.children.find(
        (child) => child.userData.isOutline
      );
      if (outline) {
        this.selectedObject.remove(outline);
        (outline as THREE.Mesh).geometry.dispose();
        const material = (outline as THREE.Mesh).material;
        if (Array.isArray(material)) {
          material.forEach(m => m.dispose());
        } else {
          material.dispose();
        }
      }
      this.selectedObject = null;
    }

    if (this.onSelectCallback) {
      this.onSelectCallback(null);
    }
  }

  public getSelectedObject(): THREE.Mesh | null {
    return this.selectedObject;
  }

  public setOnSelectCallback(callback: (object: THREE.Mesh | null) => void): void {
    this.onSelectCallback = callback;
  }

  public dispose(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('click', this.handleClick.bind(this));
    this.outlineMaterial.dispose();
  }
}
