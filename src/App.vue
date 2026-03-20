<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { SceneEditor, GeometryType, TransformMode, SceneData } from './three'

const canvasHost = ref<HTMLDivElement | null>(null)
let sceneEditor: SceneEditor | null = null

const selectedInfo = ref<string>('')
const transformMode = ref<TransformMode>('translate')
const lightEnabled = ref<boolean>(true)
const objectCount = ref<number>(0)

const updateStatus = () => {
  if (!sceneEditor) return
  
  const selected = sceneEditor.getSelectedObject()
  if (selected) {
    selectedInfo.value = `已选中: ${selected.userData.type} (ID: ${selected.userData.id.slice(0, 12)}...)`
  } else {
    selectedInfo.value = '未选中物体'
  }
  
  objectCount.value = sceneEditor.getAllObjects().length
  lightEnabled.value = sceneEditor.isLightEnabled()
}

const addGeometry = (type: GeometryType) => {
  if (!sceneEditor) return
  sceneEditor.addGeometry(type)
  updateStatus()
}

const setTransformMode = (mode: TransformMode) => {
  if (!sceneEditor) return
  sceneEditor.setTransformMode(mode)
  transformMode.value = mode
}

const deleteSelected = () => {
  if (!sceneEditor) return
  sceneEditor.deleteSelected()
  updateStatus()
}

const toggleLight = () => {
  if (!sceneEditor) return
  sceneEditor.toggleLight()
  updateStatus()
}

const exportScene = () => {
  if (!sceneEditor) return
  
  const data = sceneEditor.exportScene()
  const json = JSON.stringify(data, null, 2)
  
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `scene_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const importScene = () => {
  if (!sceneEditor) return
  
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as SceneData
        sceneEditor?.importScene(data)
        updateStatus()
      } catch (err) {
        console.error('导入场景失败:', err)
        alert('导入场景失败，请检查文件格式')
      }
    }
    reader.readAsText(file)
  }
  
  input.click()
}

const clearScene = () => {
  if (!sceneEditor) return
  if (confirm('确定要清空场景吗？')) {
    sceneEditor.clearScene()
    updateStatus()
  }
}

onMounted(() => {
  if (!canvasHost.value) return
  
  sceneEditor = new SceneEditor({
    container: canvasHost.value
  })
  
  updateStatus()
  
  canvasHost.value.addEventListener('click', updateStatus)
})

onBeforeUnmount(() => {
  if (sceneEditor) {
    sceneEditor.dispose()
    sceneEditor = null
  }
})
</script>

<template>
  <main class="app-shell">
    <div class="toolbar">
      <div class="toolbar-section">
        <span class="section-label">添加几何体</span>
        <button class="btn btn-primary" @click="addGeometry('box')">
          <span class="icon">&#9632;</span> Box
        </button>
        <button class="btn btn-primary" @click="addGeometry('sphere')">
          <span class="icon">&#9679;</span> Sphere
        </button>
        <button class="btn btn-primary" @click="addGeometry('cylinder')">
          <span class="icon">&#9644;</span> Cylinder
        </button>
      </div>
      
      <div class="toolbar-divider"></div>
      
      <div class="toolbar-section">
        <span class="section-label">变换模式</span>
        <button 
          class="btn" 
          :class="{ active: transformMode === 'translate' }"
          @click="setTransformMode('translate')"
        >
          <span class="icon">&#8596;</span> 移动
        </button>
        <button 
          class="btn" 
          :class="{ active: transformMode === 'rotate' }"
          @click="setTransformMode('rotate')"
        >
          <span class="icon">&#8635;</span> 旋转
        </button>
        <button 
          class="btn" 
          :class="{ active: transformMode === 'scale' }"
          @click="setTransformMode('scale')"
        >
          <span class="icon">&#8690;</span> 缩放
        </button>
      </div>
      
      <div class="toolbar-divider"></div>
      
      <div class="toolbar-section">
        <span class="section-label">操作</span>
        <button class="btn btn-danger" @click="deleteSelected" :disabled="!selectedInfo.includes('已选中')">
          <span class="icon">&#10005;</span> 删除
        </button>
        <button class="btn" @click="toggleLight">
          <span class="icon">{{ lightEnabled ? '&#9728;' : '&#9790;' }}</span>
          {{ lightEnabled ? '关闭光照' : '开启光照' }}
        </button>
      </div>
      
      <div class="toolbar-divider"></div>
      
      <div class="toolbar-section">
        <span class="section-label">场景</span>
        <button class="btn btn-secondary" @click="exportScene">
          <span class="icon">&#8682;</span> 导出
        </button>
        <button class="btn btn-secondary" @click="importScene">
          <span class="icon">&#8681;</span> 导入
        </button>
        <button class="btn btn-danger" @click="clearScene">
          <span class="icon">&#128465;</span> 清空
        </button>
      </div>
      
      <div class="status-bar">
        <span class="status-item">{{ selectedInfo }}</span>
        <span class="status-item">物体数量: {{ objectCount }}</span>
      </div>
    </div>
    
    <div ref="canvasHost" class="viewport"></div>
    
    <div class="help-panel">
      <div class="help-title">操作提示</div>
      <ul class="help-list">
        <li>左键点击选中物体</li>
        <li>右键拖动旋转视角</li>
        <li>滚轮缩放视图</li>
        <li>选中物体后使用变换工具</li>
      </ul>
    </div>
  </main>
</template>

<style scoped>
.app-shell {
  width: 100vw;
  height: 100vh;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(180deg, rgba(20, 28, 48, 0.95), rgba(12, 18, 34, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  flex-wrap: wrap;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-right: 4px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
}

.btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #e8ecf3;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
}

.btn:active:not(:disabled) {
  transform: scale(0.97);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn.active {
  background: rgba(74, 113, 255, 0.3);
  border-color: rgba(74, 113, 255, 0.5);
  color: #fff;
}

.btn-primary {
  background: rgba(74, 113, 255, 0.2);
  border-color: rgba(74, 113, 255, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background: rgba(74, 113, 255, 0.35);
  border-color: rgba(74, 113, 255, 0.5);
}

.btn-secondary {
  background: rgba(46, 204, 113, 0.15);
  border-color: rgba(46, 204, 113, 0.25);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(46, 204, 113, 0.3);
  border-color: rgba(46, 204, 113, 0.4);
}

.btn-danger {
  background: rgba(231, 76, 60, 0.15);
  border-color: rgba(231, 76, 60, 0.25);
}

.btn-danger:hover:not(:disabled) {
  background: rgba(231, 76, 60, 0.3);
  border-color: rgba(231, 76, 60, 0.4);
}

.icon {
  font-size: 14px;
}

.status-bar {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-item {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.viewport {
  flex: 1;
  min-height: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(12, 18, 34, 0.9), rgba(7, 10, 19, 0.96));
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
}

.viewport canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.help-panel {
  position: fixed;
  bottom: 32px;
  right: 32px;
  padding: 16px 20px;
  background: rgba(20, 28, 48, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.help-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
  color: rgba(255, 255, 255, 0.9);
}

.help-list {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.help-list li {
  padding: 4px 0;
}

.help-list li::before {
  content: '•';
  margin-right: 8px;
  color: rgba(74, 113, 255, 0.8);
}
</style>
