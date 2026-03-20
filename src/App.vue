<script setup lang="ts">import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { SceneManager } from './three/SceneManager';
import { GeometryFactory } from './three/GeometryFactory';
import { SelectionManager } from './three/SelectionManager';
import { TransformToolManager, TransformMode } from './three/TransformToolManager';
import { SceneSerializer } from './three/SceneSerializer';
const containerRef = ref<HTMLDivElement | null>(null);
let sceneManager: SceneManager | null = null;
let selectionManager: SelectionManager | null = null;
let transformToolManager: TransformToolManager | null = null;
let sceneSerializer: SceneSerializer | null = null;
const selectedObject = ref<THREE.Mesh | null>(null);
const transformMode = ref<TransformMode>(null);
const lightsEnabled = ref(true);
const gridVisible = ref(true);
const fileInputRef = ref<HTMLInputElement | null>(null);
onMounted(() => {
 if (!containerRef.value)
 return;
 sceneManager = new SceneManager(containerRef.value);
 selectionManager = new SelectionManager(sceneManager.getScene(), sceneManager.getCamera(), sceneManager.getRenderer());
 transformToolManager = new TransformToolManager(sceneManager.getScene(), sceneManager.getCamera(), sceneManager.getRenderer());
 sceneSerializer = new SceneSerializer(sceneManager.getScene());
 selectionManager.setOnSelectCallback((object) => {
 selectedObject.value = object;
 transformToolManager?.setSelectedObject(object);
 });
});
onUnmounted(() => {
 transformToolManager?.dispose();
 selectionManager?.dispose();
 sceneManager?.dispose();
});
const addBox = () => {
 if (!sceneManager)
 return;
 const box = GeometryFactory.createBox();
 box.position.set((Math.random() - 0.5) * 10, 1, (Math.random() - 0.5) * 10);
 sceneManager.addObject(box);
};
const addSphere = () => {
 if (!sceneManager)
 return;
 const sphere = GeometryFactory.createSphere();
 sphere.position.set((Math.random() - 0.5) * 10, 1, (Math.random() - 0.5) * 10);
 sceneManager.addObject(sphere);
};
const addCylinder = () => {
 if (!sceneManager)
 return;
 const cylinder = GeometryFactory.createCylinder();
 cylinder.position.set((Math.random() - 0.5) * 10, 1, (Math.random() - 0.5) * 10);
 sceneManager.addObject(cylinder);
};
const setTransformMode = (mode: TransformMode) => {
 transformMode.value = mode;
 transformToolManager?.setTransformMode(mode);
};
const toggleLights = () => {
 lightsEnabled.value = !lightsEnabled.value;
 sceneManager?.toggleLight('ambient', lightsEnabled.value);
 sceneManager?.toggleLight('directional', lightsEnabled.value);
};
const toggleGrid = () => {
 gridVisible.value = !gridVisible.value;
 sceneManager?.toggleGrid(gridVisible.value);
};
const deleteSelectedObject = () => {
 if (!selectedObject.value || !sceneManager)
 return;
 sceneManager.removeObject(selectedObject.value);
 selectedObject.value.geometry.dispose();
 if (selectedObject.value.material instanceof THREE.Material) {
 selectedObject.value.material.dispose();
 }
 selectedObject.value = null;
 transformToolManager?.setSelectedObject(null);
};
const exportScene = () => {
 if (!sceneSerializer)
 return;
 const jsonData = sceneSerializer.exportScene();
 const blob = new Blob([jsonData], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = 'scene.json';
 link.click();
 URL.revokeObjectURL(url);
};
const importScene = () => {
 fileInputRef.value?.click();
};
const handleFileImport = (event: Event) => {
 const file = (event.target as HTMLInputElement).files?.[0];
 if (!file || !sceneSerializer)
 return;
 const reader = new FileReader();
 reader.onload = (e) => {
 const content = e.target?.result as string;
 sceneSerializer?.importScene(content);
 };
 reader.readAsText(file);
 if (fileInputRef.value) {
 fileInputRef.value.value = '';
 }
};
</script>

<template>
  <div class="app-container">
    <div class="toolbar">
      <div class="toolbar-section">
        <span class="toolbar-label">添加几何体:</span>
        <button @click="addBox" class="toolbar-btn">立方体</button>
        <button @click="addSphere" class="toolbar-btn">球体</button>
        <button @click="addCylinder" class="toolbar-btn">圆柱体</button>
      </div>

      <div class="toolbar-section">
        <span class="toolbar-label">变换工具:</span>
        <button 
          @click="setTransformMode('move')" 
          class="toolbar-btn"
          :class="{ active: transformMode === 'move' }"
        >
          移动
        </button>
        <button 
          @click="setTransformMode('rotate')" 
          class="toolbar-btn"
          :class="{ active: transformMode === 'rotate' }"
        >
          旋转
        </button>
        <button 
          @click="setTransformMode('scale')" 
          class="toolbar-btn"
          :class="{ active: transformMode === 'scale' }"
        >
          缩放
        </button>
      </div>

      <div class="toolbar-section">
        <span class="toolbar-label">场景:</span>
        <button 
          @click="toggleLights" 
          class="toolbar-btn"
          :class="{ active: lightsEnabled }"
        >
          灯光
        </button>
        <button 
          @click="toggleGrid" 
          class="toolbar-btn"
          :class="{ active: gridVisible }"
        >
          网格
        </button>
      </div>

      <div class="toolbar-section">
        <span class="toolbar-label">导出/导入:</span>
        <button @click="exportScene" class="toolbar-btn">导出场景</button>
        <button @click="importScene" class="toolbar-btn">导入场景</button>
        <input 
          ref="fileInputRef" 
          type="file" 
          accept=".json" 
          style="display: none" 
          @change="handleFileImport"
        />
      </div>

      <div class="toolbar-section" v-if="selectedObject">
        <button @click="deleteSelectedObject" class="toolbar-btn delete-btn">删除选中</button>
      </div>
    </div>

    <div class="scene-container" ref="containerRef"></div>

    <div class="info-panel">
      <h3>操作说明</h3>
      <ul>
        <li>右键拖动: 旋转视角</li>
        <li>滚轮: 缩放</li>
        <li>左键点击: 选择物体</li>
        <li>选择变换工具后拖动坐标轴: 变换物体</li>
      </ul>
      <div v-if="selectedObject" class="selected-info">
        <h4>选中物体</h4>
        <p>类型: {{ selectedObject.userData.type }}</p>
        <p>ID: {{ selectedObject.userData.id }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #1a1a2e;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 20px;
  background-color: #16213e;
  border-bottom: 1px solid #0f3460;
  align-items: center;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 15px;
  border-right: 1px solid #0f3460;
}

.toolbar-section:last-child {
  border-right: none;
}

.toolbar-label {
  color: #e0e0e0;
  font-size: 14px;
  margin-right: 5px;
}

.toolbar-btn {
  padding: 8px 16px;
  background-color: #0f3460;
  color: #e0e0e0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background-color: #1a4a7a;
}

.toolbar-btn.active {
  background-color: #e94560;
}

.delete-btn {
  background-color: #c0392b;
}

.delete-btn:hover {
  background-color: #e74c3c;
}

.scene-container {
  flex: 1;
  position: relative;
}

.info-panel {
  position: absolute;
  top: 80px;
  right: 20px;
  width: 250px;
  background-color: rgba(22, 33, 62, 0.95);
  padding: 20px;
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.info-panel h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #e94560;
  font-size: 16px;
}

.info-panel ul {
  padding-left: 20px;
  margin: 0;
}

.info-panel li {
  margin-bottom: 8px;
}

.selected-info {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #0f3460;
}

.selected-info h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #4a90e2;
}

.selected-info p {
  margin: 5px 0;
  font-size: 13px;
  word-break: break-all;
}
</style>
