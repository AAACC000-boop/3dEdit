<template>
  <div class="scene-editor">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-section">
        <span class="toolbar-label">添加物体:</span>
        <button class="btn" @click="addGeometry(GeometryType.Box)">Box</button>
        <button class="btn" @click="addGeometry(GeometryType.Sphere)">Sphere</button>
        <button class="btn" @click="addGeometry(GeometryType.Cylinder)">Cylinder</button>
      </div>

      <div class="toolbar-section">
        <span class="toolbar-label">变换模式:</span>
        <button
          class="btn"
          :class="{ active: transformMode === TransformMode.Move }"
          @click="setTransformMode(TransformMode.Move)"
        >
          Move
        </button>
        <button
          class="btn"
          :class="{ active: transformMode === TransformMode.Rotate }"
          @click="setTransformMode(TransformMode.Rotate)"
        >
          Rotate
        </button>
        <button
          class="btn"
          :class="{ active: transformMode === TransformMode.Scale }"
          @click="setTransformMode(TransformMode.Scale)"
        >
          Scale
        </button>
      </div>

      <div class="toolbar-section">
        <span class="toolbar-label">操作:</span>
        <button class="btn btn-danger" :disabled="!selectedObject" @click="deleteSelected">
          删除
        </button>
        <button class="btn" :class="{ active: isLightingEnabled }" @click="toggleLighting">
          {{ isLightingEnabled ? '关闭灯光' : '开启灯光' }}
        </button>
      </div>

      <div class="toolbar-section">
        <span class="toolbar-label">场景:</span>
        <button class="btn" @click="handleExport">导出JSON</button>
        <button class="btn" @click="handleImport">导入JSON</button>
      </div>
    </div>

    <!-- 3D场景容器 -->
    <div ref="containerRef" class="scene-container"></div>

    <!-- 状态信息 -->
    <div class="status-bar">
      <span v-if="selectedObject">已选中: {{ selectedObject.userData.type || 'Object' }}</span>
      <span v-else>点击物体进行选择</span>
      <span class="hint">右键拖动旋转视角 | 滚轮缩放</span>
    </div>

    <!-- 导出对话框 -->
    <div v-if="showExportDialog" class="dialog-overlay" @click="showExportDialog = false">
      <div class="dialog" @click.stop>
        <h3>导出场景数据</h3>
        <textarea v-model="exportData" readonly></textarea>
        <div class="dialog-actions">
          <button class="btn" @click="copyToClipboard">复制</button>
          <button class="btn" @click="showExportDialog = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 导入对话框 -->
    <div v-if="showImportDialog" class="dialog-overlay" @click="showImportDialog = false">
      <div class="dialog" @click.stop>
        <h3>导入场景数据</h3>
        <textarea v-model="importData" placeholder="粘贴JSON数据..."></textarea>
        <div class="dialog-actions">
          <button class="btn" @click="confirmImport">导入</button>
          <button class="btn" @click="showImportDialog = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSceneEditor } from '../composables/useSceneEditor'
import { GeometryType, TransformMode } from '../types'

const {
  containerRef,
  selectedObject,
  transformMode,
  isLightingEnabled,
  addGeometry,
  deleteSelected,
  setTransformMode,
  toggleLighting,
  exportScene,
  importScene
} = useSceneEditor()

const showExportDialog = ref(false)
const showImportDialog = ref(false)
const exportData = ref('')
const importData = ref('')

const handleExport = () => {
  exportData.value = exportScene()
  showExportDialog.value = true
}

const handleImport = () => {
  importData.value = ''
  showImportDialog.value = true
}

const confirmImport = () => {
  if (importData.value.trim()) {
    importScene(importData.value.trim())
    showImportDialog.value = false
  }
}

const copyToClipboard = () => {
  navigator.clipboard.writeText(exportData.value)
  alert('已复制到剪贴板')
}
</script>

<style scoped>
.scene-editor {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: #1a1a2e;
  color: #fff;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 12px 20px;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-label {
  font-size: 12px;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn {
  padding: 6px 14px;
  background: #0f3460;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn:hover {
  background: #1a4a7a;
}

.btn.active {
  background: #e94560;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  background: #c0392b;
}

.btn-danger:hover {
  background: #e74c3c;
}

.scene-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 8px 20px;
  background: #16213e;
  border-top: 1px solid #0f3460;
  font-size: 12px;
  color: #a0a0a0;
}

.hint {
  color: #666;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: #16213e;
  padding: 24px;
  border-radius: 8px;
  width: 500px;
  max-width: 90vw;
}

.dialog h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
}

.dialog textarea {
  width: 100%;
  height: 200px;
  background: #1a1a2e;
  color: #fff;
  border: 1px solid #0f3460;
  border-radius: 4px;
  padding: 12px;
  font-family: monospace;
  font-size: 12px;
  resize: none;
  box-sizing: border-box;
}

.dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
