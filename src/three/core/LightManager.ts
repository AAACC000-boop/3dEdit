import * as THREE from 'three'

export class LightManager {
  private scene: THREE.Scene
  private ambientLight: THREE.AmbientLight
  private directionalLight: THREE.DirectionalLight
  private enabled: boolean = true

  constructor(scene: THREE.Scene) {
    this.scene = scene

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.ambientLight.name = 'ambientLight'

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    this.directionalLight.position.set(5, 10, 7)
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.width = 2048
    this.directionalLight.shadow.mapSize.height = 2048
    this.directionalLight.shadow.camera.near = 0.5
    this.directionalLight.shadow.camera.far = 50
    this.directionalLight.shadow.camera.left = -10
    this.directionalLight.shadow.camera.right = 10
    this.directionalLight.shadow.camera.top = 10
    this.directionalLight.shadow.camera.bottom = -10
    this.directionalLight.name = 'directionalLight'

    this.addToScene()
  }

  private addToScene(): void {
    this.scene.add(this.ambientLight)
    this.scene.add(this.directionalLight)
  }

  toggle(): boolean {
    this.enabled = !this.enabled

    if (this.enabled) {
      this.ambientLight.intensity = 0.4
      this.directionalLight.intensity = 0.8
    } else {
      this.ambientLight.intensity = 0.8
      this.directionalLight.intensity = 0
    }

    return this.enabled
  }

  isEnabled(): boolean {
    return this.enabled
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled !== enabled) {
      this.toggle()
    }
  }

  dispose(): void {
    this.scene.remove(this.ambientLight)
    this.scene.remove(this.directionalLight)
    this.directionalLight.dispose()
  }
}
