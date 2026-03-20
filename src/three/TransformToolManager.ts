import * as THREE from 'three';

export type TransformMode = 'move' | 'rotate' | 'scale' | null;

/**
 * 变换工具管理器 - 负责物体的平移、旋转和缩放变换
 * 使用局部坐标系进行变换操作
 */
export class TransformToolManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private selectedObject: THREE.Mesh | null = null;
  private currentMode: TransformMode = null;
  private transformGizmo: THREE.Group | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean = false;
  private dragAxis: string | null = null;
  private startPosition: THREE.Vector3 = new THREE.Vector3();
  private startRotation: THREE.Quaternion = new THREE.Quaternion();
  private startScale: THREE.Vector3 = new THREE.Vector3();
  private planeNormal: THREE.Vector3 = new THREE.Vector3();
  private plane: THREE.Plane = new THREE.Plane();
  private dragStartPoint: THREE.Vector3 = new THREE.Vector3();
  private dragCurrentPoint: THREE.Vector3 = new THREE.Vector3();
  private lastValidIntersection: THREE.Vector3 = new THREE.Vector3();
  private hasValidIntersection: boolean = false;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();
  }

  private handleMouseDown(event: MouseEvent): void {
    if (!this.transformGizmo || !this.selectedObject) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.transformGizmo.children, true);

    if (intersects.length > 0) {
      let axis = intersects[0].object.userData.axis;
      if (!axis && intersects[0].object.parent) {
        axis = intersects[0].object.parent.userData.axis;
      }
      
      if (axis) {
        this.isDragging = true;
        this.dragAxis = axis;
        this.startPosition.copy(this.selectedObject.position);
        this.startRotation.copy(this.selectedObject.quaternion);
        this.startScale.copy(this.selectedObject.scale);
        
        this.dragStartPoint.copy(intersects[0].point);
        this.lastValidIntersection.copy(intersects[0].point);
        this.hasValidIntersection = true;

        this.setupDragPlane(axis);
      }
    }
  }

  private setupDragPlane(axis: string): void {
    if (!this.selectedObject || !this.transformGizmo) return;

    const cameraToObject = new THREE.Vector3()
      .subVectors(this.camera.position, this.selectedObject.position)
      .normalize();

    const axisVector = this.getLocalAxisVector(axis);
    
    if (this.currentMode === 'rotate') {
      this.planeNormal.copy(axisVector);
    } else {
      const perpendicular = new THREE.Vector3().crossVectors(axisVector, cameraToObject).normalize();
      if (perpendicular.length() > 0.1) {
        this.planeNormal.crossVectors(axisVector, perpendicular).normalize();
      } else {
        const up = new THREE.Vector3(0, 1, 0);
        if (Math.abs(axisVector.dot(up)) > 0.9) {
          this.planeNormal.set(0, 0, 1);
        } else {
          this.planeNormal.copy(up);
        }
      }
    }

    this.plane.setFromNormalAndCoplanarPoint(this.planeNormal, this.selectedObject.position);
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.selectedObject || !this.dragAxis) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectionPoint = new THREE.Vector3();
    const intersects = this.raycaster.ray.intersectPlane(this.plane, intersectionPoint);

    if (intersects) {
      this.dragCurrentPoint.copy(intersectionPoint);
      this.lastValidIntersection.copy(intersectionPoint);
      this.hasValidIntersection = true;
      
      const delta = intersectionPoint.clone().sub(this.dragStartPoint);

      if (this.currentMode === 'move') {
        this.applyMove(delta);
      } else if (this.currentMode === 'rotate') {
        this.applyRotate(delta);
      } else if (this.currentMode === 'scale') {
        this.applyScale(delta);
      }
    }
  }

  private handleMouseUp(): void {
    this.isDragging = false;
    this.dragAxis = null;
    this.hasValidIntersection = false;
  }

  private applyMove(delta: THREE.Vector3): void {
    if (!this.selectedObject) return;

    const axisVector = this.getLocalAxisVector(this.dragAxis!);
    const projection = delta.dot(axisVector);
    const moveVector = axisVector.clone().multiplyScalar(projection);

    this.selectedObject.position.copy(this.startPosition.clone().add(moveVector));
    this.updateGizmoTransform();
  }

  private applyRotate(delta: THREE.Vector3): void {
    if (!this.selectedObject) return;

    const axisVector = this.getLocalAxisVector(this.dragAxis!);
    
    const toStart = this.dragStartPoint.clone().sub(this.startPosition).normalize();
    const toCurrent = this.dragCurrentPoint.clone().sub(this.startPosition).normalize();
    
    let angleDelta = Math.atan2(
      toStart.cross(toCurrent).dot(axisVector),
      toStart.dot(toCurrent)
    );

    const rotationQuat = new THREE.Quaternion().setFromAxisAngle(axisVector, angleDelta);
    this.selectedObject.quaternion.copy(this.startRotation.clone().multiply(rotationQuat));
    this.updateGizmoTransform();
  }

  private applyScale(delta: THREE.Vector3): void {
    if (!this.selectedObject) return;

    const axisVector = this.getLocalAxisVector(this.dragAxis!);
    const projection = delta.dot(axisVector);
    
    const baseLength = 2;
    const scaleFactor = 1 + (projection / baseLength);

    const newScale = this.startScale.clone();
    if (this.dragAxis === 'x') newScale.x *= scaleFactor;
    if (this.dragAxis === 'y') newScale.y *= scaleFactor;
    if (this.dragAxis === 'z') newScale.z *= scaleFactor;

    this.selectedObject.scale.copy(newScale);
    this.updateGizmoTransform();
  }

  private getLocalAxisVector(axis: string): THREE.Vector3 {
    if (!this.selectedObject) {
      return this.getWorldAxisVector(axis);
    }

    const vector = this.getWorldAxisVector(axis);
    vector.applyQuaternion(this.selectedObject.quaternion);
    return vector.normalize();
  }

  private getWorldAxisVector(axis: string): THREE.Vector3 {
    switch (axis) {
      case 'x': return new THREE.Vector3(1, 0, 0);
      case 'y': return new THREE.Vector3(0, 1, 0);
      case 'z': return new THREE.Vector3(0, 0, 1);
      default: return new THREE.Vector3(1, 0, 0);
    }
  }

  private getAxisColor(axis: string): number {
    switch (axis) {
      case 'x': return 0xff0000;
      case 'y': return 0x00ff00;
      case 'z': return 0x0000ff;
      default: return 0xffffff;
    }
  }

  public setSelectedObject(object: THREE.Mesh | null): void {
    this.selectedObject = object;
    if (object) {
      this.showTransformGizmo();
    } else {
      this.hideTransformGizmo();
    }
  }

  public setTransformMode(mode: TransformMode): void {
    this.currentMode = mode;
    if (this.selectedObject) {
      this.showTransformGizmo();
    }
  }

  private showTransformGizmo(): void {
    this.hideTransformGizmo();
    if (!this.selectedObject || !this.currentMode) return;

    this.transformGizmo = new THREE.Group();
    this.updateGizmoTransform();

    if (this.currentMode === 'move') {
      this.createMoveGizmo();
    } else if (this.currentMode === 'rotate') {
      this.createRotateGizmo();
    } else if (this.currentMode === 'scale') {
      this.createScaleGizmo();
    }

    this.scene.add(this.transformGizmo);
  }

  private createMoveGizmo(): void {
    if (!this.transformGizmo) return;

    const arrowLength = 2;
    const arrowHeadLength = 0.3;
    const arrowHeadWidth = 0.15;

    ['x', 'y', 'z'].forEach((axis) => {
      const direction = this.getWorldAxisVector(axis);
      const color = this.getAxisColor(axis);
      
      const arrowGroup = new THREE.Group();
      arrowGroup.userData.axis = axis;
      
      const arrowHelper = new THREE.ArrowHelper(
        direction,
        new THREE.Vector3(0, 0, 0),
        arrowLength,
        color,
        arrowHeadLength,
        arrowHeadWidth
      );
      
      arrowHelper.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.userData.axis = axis;
        }
      });
      
      arrowGroup.add(arrowHelper);
      this.transformGizmo!.add(arrowGroup);
    });
  }

  private createRotateGizmo(): void {
    if (!this.transformGizmo) return;

    const radius = 1.5;
    const tube = 0.05;
    const radialSegments = 8;
    const tubularSegments = 64;

    ['x', 'y', 'z'].forEach((axis) => {
      const color = this.getAxisColor(axis);
      const geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
      const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const torus = new THREE.Mesh(geometry, material);
      torus.userData.axis = axis;

      if (axis === 'x') torus.rotation.y = Math.PI / 2;
      if (axis === 'y') torus.rotation.x = Math.PI / 2;

      this.transformGizmo!.add(torus);
    });
  }

  private createScaleGizmo(): void {
    if (!this.transformGizmo) return;

    const boxSize = 0.15;
    const lineLength = 1.5;

    ['x', 'y', 'z'].forEach((axis) => {
      const direction = this.getWorldAxisVector(axis);
      const color = this.getAxisColor(axis);

      const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
      const boxMaterial = new THREE.MeshBasicMaterial({ color });
      const box = new THREE.Mesh(boxGeometry, boxMaterial);
      box.position.copy(direction.clone().multiplyScalar(lineLength));
      box.userData.axis = axis;

      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        direction.clone().multiplyScalar(lineLength)
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({ color });
      const line = new THREE.Line(lineGeometry, lineMaterial);

      this.transformGizmo!.add(box, line);
    });
  }

  private hideTransformGizmo(): void {
    if (this.transformGizmo) {
      this.scene.remove(this.transformGizmo);
      this.transformGizmo.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const material = child.material;
          if (Array.isArray(material)) {
            material.forEach(m => m.dispose());
          } else if (material instanceof THREE.Material) {
            material.dispose();
          }
        }
      });
      this.transformGizmo = null;
    }
  }

  private updateGizmoTransform(): void {
    if (this.transformGizmo && this.selectedObject) {
      this.transformGizmo.position.copy(this.selectedObject.position);
      this.transformGizmo.quaternion.copy(this.selectedObject.quaternion);
    }
  }

  public dispose(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    canvas.removeEventListener('wheel', this.handleWheel.bind(this));
    this.hideTransformGizmo();
  }
}
