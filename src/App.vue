<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { PerspectiveCamera, Scene, WebGLRenderer } from 'three'

const canvasHost = ref<HTMLDivElement | null>(null)

let renderer: WebGLRenderer | null = null
let scene: Scene | null = null
let camera: PerspectiveCamera | null = null
let frameId = 0

const renderScene = () => {
  if (!canvasHost.value || !renderer || !scene || !camera) {
    return
  }

  const { clientWidth, clientHeight } = canvasHost.value
  renderer.setSize(clientWidth, clientHeight, false)
  camera.aspect = clientWidth / Math.max(clientHeight, 1)
  camera.updateProjectionMatrix()
  renderer.render(scene, camera)
}

const resize = () => {
  renderScene()
}

onMounted(() => {
  if (!canvasHost.value) {
    return
  }

  scene = new Scene()
  camera = new PerspectiveCamera(60, 1, 0.1, 100)
  camera.position.z = 3
  renderer = new WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  canvasHost.value.appendChild(renderer.domElement)

  const loop = () => {
    renderScene()
    frameId = window.requestAnimationFrame(loop)
  }

  resize()
  window.addEventListener('resize', resize)
  frameId = window.requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)

  if (frameId) {
    window.cancelAnimationFrame(frameId)
  }

  if (renderer) {
    renderer.dispose()
    renderer.domElement.remove()
    renderer = null
  }

  camera = null
  scene = null
})
</script>

<template>
  <main class="app-shell">
    <div ref="canvasHost" class="viewport"></div>
  </main>
</template>
