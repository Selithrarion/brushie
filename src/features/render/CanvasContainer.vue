<template>
	<div class="flex min-h-screen flex-col bg-gradient-to-br from-blue-100 via-pink-100 to-green-100">
		<CanvasToolbar v-model="toolManager.selectedTool.value" :tools="toolManager.tools" />

		<component
			:is="canvasComponent"
			ref="canvasComponentRef"
			:menu="menu"
			:toolManager="toolManager"
			@update:selectedTool="toolManager.selectedTool.value = $event"
		/>

		<UiMenu :items="menu.items.value" :onClose="menu.close" :visible="menu.visible.value" :x="menu.x.value" :y="menu.y.value" />

		<div class="fixed right-4 bottom-4 left-4 flex flex-wrap gap-2">
			<UiButton variant="secondary" @click="resetRoom">Reset room</UiButton>
			<UiButton variant="secondary" @click="reconnect">Reconnect</UiButton>

			<div class="flex flex-col">
				<span class="flex items-center text-sm">Status: {{ status }}</span>
				<span class="flex items-center text-sm">Peers: {{ peersCount }}</span>
			</div>

			<div class="ml-auto flex items-center gap-2">
				<div class="flex">
					<UiButton buttonClass="rounded-r-none !p-2" variant="secondary" @click="zoomIn"><ZoomIn /></UiButton>
					<UiButton class="h-[40px] rounded-none !px-1 !py-2 text-xs" tooltip="Reset zoom" variant="secondary" @click="resetZoom">
						{{ zoomPercent }}
					</UiButton>
					<UiButton buttonClass="rounded-l-none !p-2" variant="secondary" @click="zoomOut"><ZoomOut /></UiButton>
				</div>

				<div class="flex">
					<UiButton buttonClass="rounded-r-none !p-2" tooltip="Undo" variant="secondary" @click="undo"><Undo /></UiButton>
					<UiButton buttonClass="rounded-l-none !p-2" tooltip="Redo" variant="secondary" @click="redo"><Redo /></UiButton>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { Redo, Undo, ZoomIn, ZoomOut } from 'lucide-vue-next'
import { ref, computed } from 'vue'

import { useZoom2D } from '@/features/render/2d/useZoom2D.ts'
import CanvasToolbar from '@/features/render/CanvasToolbar.vue'
import { useToolManager } from '@/features/render/hooks/useToolManager.ts'
import { useYShapes } from '@/features/sync/useYShapes.ts'
import UiMenu from '@/shared/ui/menu/UiMenu.vue'
import { useContextMenu } from '@/shared/ui/menu/useContextMenu.ts'
import UiButton from '@/shared/ui/UiButton.vue'

import Canvas2D from './2d/Canvas2D.vue'
import Canvas3D from './Canvas3D.vue'

const props = defineProps<{
	canvasType?: '2d' | '3d'
}>()

const { peersCount, status, undo, redo, reconnect, resetRoom } = useYShapes()
const toolManager = useToolManager()
const menu = useContextMenu()

interface CanvasInstance {
	zoom: ReturnType<typeof useZoom2D>
	draw: () => void
	canvasRef: HTMLCanvasElement
}
const canvasComponent = computed(() => (props.canvasType === '3d' ? Canvas3D : Canvas2D))
const canvasComponentRef = ref<CanvasInstance | null>(null)

const zoomPercent = computed(() => {
	return canvasComponentRef.value?.zoom ? `${Math.round(canvasComponentRef.value.zoom.scale.value * 100)}%` : ''
})

function zoomIn() {
	canvasComponentRef.value?.zoom && canvasComponentRef.value.zoom.zoomAtCenter(1.1, canvasComponentRef.value.canvasRef!)
}
function zoomOut() {
	canvasComponentRef.value?.zoom && canvasComponentRef.value.zoom.zoomAtCenter(0.9, canvasComponentRef.value.canvasRef!)
}
function resetZoom() {
	canvasComponentRef.value?.zoom && canvasComponentRef.value.zoom.resetZoom()
}
</script>
