<template>
	<div class="flex min-h-screen flex-col bg-gradient-to-br from-blue-100 via-pink-100 to-green-100">
		<CanvasToolbar v-model="toolManager.selectedTool.value" :tools="toolManager.tools" @action="handleToolbarAction" />

		<component :is="canvasComponent" ref="canvasComponentRef" :menu="menu" :toolManager="toolManager" />

		<UiMenu :items="menu.items.value" :onClose="menu.close" :visible="menu.visible.value" :x="menu.x.value" :y="menu.y.value" />

		<div class="fixed right-4 bottom-4 left-4 flex flex-wrap gap-2">
			<UiButton @click="resetRoom">Reset room</UiButton>
			<UiButton @click="reconnect">Reconnect</UiButton>

			<div class="flex flex-col">
				<span class="flex items-center text-sm">Status: {{ status }}</span>
				<span class="flex items-center text-sm">Peers: {{ peersCount }}</span>
			</div>

			<UiButton class="ml-auto !p-2" @click="undo"><Undo /></UiButton>
			<UiButton class="!p-2" @click="redo"><Redo /></UiButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import { Redo, Undo } from 'lucide-vue-next'
import { ref, computed } from 'vue'

import CanvasToolbar from '@/features/render/CanvasToolbar.vue'
import { useCanvasZoom } from '@/features/render/useCanvasZoom.ts'
import { useToolManager } from '@/features/render/useToolManager.ts'
import { useUndoRedo } from '@/features/sync/useUndoRedo.ts'
import { useYShapes } from '@/features/sync/useYShapes.ts'
import UiMenu from '@/shared/ui/menu/UiMenu.vue'
import { useContextMenu } from '@/shared/ui/menu/useContextMenu.ts'
import UiButton from '@/shared/ui/UiButton.vue'

import Canvas2D from './Canvas2D.vue'
import Canvas3D from './Canvas3D.vue'

const props = defineProps<{
	canvasType?: '2d' | '3d'
}>()

const { peersCount, status, undo, redo, reconnect, resetRoom } = useYShapes()
useUndoRedo(undo, redo)
const toolManager = useToolManager()
const menu = useContextMenu()

interface CanvasInstance {
	zoom: ReturnType<typeof useCanvasZoom>
	draw: () => void
	canvasRef: HTMLCanvasElement
}
const canvasComponent = computed(() => (props.canvasType === '3d' ? Canvas3D : Canvas2D))
const canvasComponentRef = ref<CanvasInstance | null>(null)

function handleToolbarAction(action: string) {
	toolManager.handleToolbarAction(action, {
		zoomIn: () =>
			canvasComponentRef.value?.zoom && canvasComponentRef.value.zoom.zoomAtCenter(1.1, canvasComponentRef.value.canvasRef!),
		zoomOut: () =>
			canvasComponentRef.value?.zoom && canvasComponentRef.value.zoom.zoomAtCenter(0.9, canvasComponentRef.value.canvasRef!),
	})
	canvasComponentRef.value?.draw()
}
</script>
