<template>
	<div class="flex min-h-screen flex-col bg-gradient-to-br from-blue-100 via-pink-100 to-green-100">
		<CanvasToolbar v-model="toolManager.selectedTool.value" :tools="toolManager.tools" />

		<component
			:is="canvasComponent"
			ref="canvasComponentRef"
			:toolManager="toolManager"
			@update:selectedTool="toolManager.selectedTool.value = $event"
		/>

		<div class="fixed right-4 bottom-4 left-4 flex flex-wrap gap-2">
			<div class="floating-inertia-ui flex flex-wrap gap-2">
				<UiButton variant="secondary" @click="resetRoom">Reset room</UiButton>
				<UiButton variant="secondary" @click="reconnect">Reconnect</UiButton>

				<div class="flex flex-col gap-1 text-sm text-slate-600 select-none">
					<div v-if="!isOnline" class="flex items-center gap-2">
						<span class="h-2.5 w-2.5 rounded-full bg-red-400" />
						<span>Network: Offline</span>
					</div>
					<div v-else class="flex items-center gap-2">
						<span class="h-2.5 w-2.5 rounded-full" :class="roomStatusColor" />
						<span>Room: {{ status === YRoomStatus.CONNECTED ? 'Connected' : 'Disconnected' }}</span>
					</div>

					<div class="flex items-center gap-1.5">
						<span class="h-2.5 w-2.5 rounded-full bg-blue-400" />
						<span>Peers: {{ peersCount }}</span>
					</div>
				</div>
			</div>

			<div class="floating-inertia-ui ml-auto flex items-center gap-2">
				<div class="flex rounded-lg border border-white/30">
					<UiButton buttonClass="rounded-r-none !p-2 !border-none" variant="secondary" @click="zoomIn"><ZoomIn /></UiButton>
					<UiButton
						button-class="h-[40px] rounded-none !px-1 !py-2 text-xs !border-none"
						tooltip="Reset zoom, double click to reset offset too"
						variant="secondary"
						@click="resetZoom"
						@dblclick="resetOffset"
					>
						{{ zoomPercent }}
					</UiButton>
					<UiButton buttonClass="rounded-l-none !p-2 !border-none" variant="secondary" @click="zoomOut"><ZoomOut /></UiButton>
				</div>

				<div class="flex rounded-lg border border-white/30">
					<UiButton buttonClass="rounded-r-none !p-2 !border-none" tooltip="Undo" variant="secondary" @click="undo">
						<Undo />
					</UiButton>
					<UiButton buttonClass="rounded-l-none !p-2 !border-none" tooltip="Redo" variant="secondary" @click="redo">
						<Redo />
					</UiButton>
				</div>

				<UiButton
					:buttonClass="`!p-2 !border-none ${gameMode.isGameMode.value ? '!bg-emerald-300' : '!bg-red-300'}`"
					tooltip="Game Mode (clickable rect)"
					variant="secondary"
					@click="gameMode.toggleGame"
				>
					<Gamepad2Icon />
				</UiButton>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { Redo, Undo, ZoomIn, ZoomOut, Gamepad2Icon } from 'lucide-vue-next'
import { computed, useTemplateRef } from 'vue'

import type { useZoom3D } from '@/features/editor/editor-core/hooks/useZoom3D.ts'
import { useGameMode } from '@/features/editor/editor-game/useGameMode.ts'
import CanvasToolbar from '@/features/editor/editor-ui/CanvasToolbar.vue'
import { useToolManager } from '@/features/editor/editor-ui/hooks/useToolManager.ts'
import { YRoomStatus } from '@/features/editor/edtitor-sync/types/yjs.types.ts'
import { useSyncShapes } from '@/features/editor/edtitor-sync/useSyncShapes.ts'
import { useYjs } from '@/features/editor/edtitor-sync/useYjs.ts'
import { useOnline } from '@/features/pwa/useOnline.ts'
import UiButton from '@/shared/ui/UiButton.vue'

import Canvas3D from '../editor-core/Canvas3D.vue'

const props = defineProps<{
	canvasType?: '2d' | '3d'
}>()

const gameMode = useGameMode()

const { isOnline } = useOnline()
const { peersCount, status, reconnect } = useYjs()
const { undo, redo, resetRoom } = useSyncShapes()

const roomStatusColor = computed(() => (status.value === 'connected' ? 'bg-emerald-400' : 'bg-red-400'))

const toolManager = useToolManager()

interface CanvasInstance {
	zoom: ReturnType<typeof useZoom3D>
	draw: () => void
	canvasRef: HTMLCanvasElement
}
const canvasComponent = computed(() => (props.canvasType === '3d' ? Canvas3D : Canvas3D))
const canvasComponentRef = useTemplateRef<CanvasInstance>('canvasComponentRef')

const zoomPercent = computed(() => {
	return canvasComponentRef.value?.zoom ? `${Math.round(canvasComponentRef.value.zoom.scale.value * 100)}%` : ''
})

function zoomIn() {
	canvasComponentRef.value?.zoom && canvasComponentRef.value.zoom.zoomAtCenter(1.1)
}
function zoomOut() {
	canvasComponentRef.value?.zoom && canvasComponentRef.value.zoom.zoomAtCenter(0.9)
}
function resetZoom() {
	canvasComponentRef.value?.zoom && canvasComponentRef.value.zoom.resetZoom()
}
function resetOffset() {
	canvasComponentRef.value?.zoom && canvasComponentRef.value.zoom.resetOffset()
}
</script>
