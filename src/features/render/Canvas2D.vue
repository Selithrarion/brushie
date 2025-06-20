<template>
	<canvas
		ref="canvasRef"
		class="absolute right-0 left-0 h-full w-full"
		@contextmenu.prevent="onContextMenu"
		@mousedown="onMouseDown"
		@mouseleave="onMouseLeave"
		@mousemove="onMouseMove"
		@mouseup="onMouseUp"
		@wheel.prevent="handleWheel"
	/>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watchEffect, ref } from 'vue'

import { useCanvasRenderer } from '@/features/render/useCanvasRenderer.ts'
import { useCanvasZoom } from '@/features/render/useCanvasZoom.ts'
import { usePanInteraction } from '@/features/render/usePanInteraction.ts'
import { useShapeInteractions } from '@/features/render/useShapeInteractions.ts'
import { useToolManager } from '@/features/render/useToolManager.ts'
import { getPos } from '@/features/render/utils/getPos.ts'
import { useRemoteCursors } from '@/features/sync/useRemoteCursors.ts'
import { useUndoRedo } from '@/features/sync/useUndoRedo.ts'
import { useYShapes } from '@/features/sync/useYShapes.ts'
import { useContextMenu } from '@/shared/ui/menu/useContextMenu.ts'

const { toolManager, menu } = defineProps<{
	toolManager: ReturnType<typeof useToolManager>
	menu: ReturnType<typeof useContextMenu>
}>()

const canvasRef = ref<HTMLCanvasElement>()

const { provider, shapes, undo, redo } = useYShapes()
useUndoRedo(undo, redo)
const zoom = useCanvasZoom()
const pan = usePanInteraction()
const remoteCursors = useRemoteCursors(provider)
const shapeInteractions = useShapeInteractions()
const renderer = useCanvasRenderer(canvasRef, { shapes, zoom, shapeInteractions, remoteCursors })

defineExpose({
	zoom,
	draw,
	canvasRef,
})

let isInitialized = false
watchEffect(() => {
	if (!isInitialized && shapes.value.length === 0) return
	draw()
	isInitialized = true
})

function onContextMenu($event: MouseEvent) {
	const p = getPos($event, canvasRef.value!)
	const canvasPoint = zoom.getCanvasPoint(p)
	const shape = shapeInteractions.findShapeAtPos(canvasPoint)

	const isLocked = shape && shapeInteractions.lockedShapeIDs.value.includes(shape.id)
	if (isLocked) return

	if (shape) {
		menu.openAtPosition($event.clientX, $event.clientY, [{ label: 'Delete', action: () => shapeInteractions.deleteShape(shape.id) }])
	} else {
		menu.openAtPosition($event.clientX, $event.clientY, [
			{ label: 'Create shape', action: () => shapeInteractions.createShape(canvasPoint) },
		])
	}
}

function handleGlobalMouseUp() {
	if (toolManager.selectedTool.value === 'select') {
		shapeInteractions.handleMouseUp()
		draw()
	}
}

function handleGlobalMouseLeave() {
	if (toolManager.selectedTool.value === 'select') {
		shapeInteractions.handleMouseLeave()
	}
}

const handleResize = () => renderer.resizeCanvas()

onMounted(() => {
	handleResize()
	window.addEventListener('resize', handleResize)
	window.addEventListener('mouseup', handleGlobalMouseUp)
	window.addEventListener('mouseleave', handleGlobalMouseLeave)
})

onBeforeUnmount(() => {
	window.removeEventListener('resize', handleResize)
	window.removeEventListener('mouseup', handleGlobalMouseUp)
	window.removeEventListener('mouseleave', handleGlobalMouseLeave)
})

function draw() {
	renderer.draw()
}

function onMouseDown($event: MouseEvent) {
	if (menu.visible.value) return
	if ($event.button === 2) return

	const p = getPos($event, canvasRef.value!)
	const canvasPoint = zoom.getCanvasPoint(p)

	switch (toolManager.selectedTool.value) {
		case 'select':
			const shape = shapeInteractions.findShapeAtPos(canvasPoint)
			if (shape) shapeInteractions.handleMouseDown(canvasPoint)
			else pan.startPan(p)
			break
		case 'rect':
			shapeInteractions.createShape(canvasPoint)
			break
		case 'ellipse':
			shapeInteractions.createShape(canvasPoint)
			break
		case 'line':
			shapeInteractions.createShape(canvasPoint)
			break
		case 'delete': {
			const shape = shapeInteractions.findShapeAtPos(canvasPoint)
			if (shape && !shapeInteractions.lockedShapeIDs.value.includes(shape.id)) shapeInteractions.deleteShape(shape.id)
			break
		}
		default:
			shapeInteractions.handleMouseDown(canvasPoint)
	}

	draw()
}

function onMouseMove(e: MouseEvent) {
	if (menu.visible.value) return

	if (pan.updatePan({ x: e.clientX, y: e.clientY }, zoom.offset.value, draw)) return

	const p = getPos(e, canvasRef.value!)
	const canvasPoint = zoom.getCanvasPoint(p)
	remoteCursors.updateCursor(canvasPoint)

	const oldHover = shapeInteractions.hoveredShapeID.value
	if (toolManager.selectedTool.value === 'select') shapeInteractions.handleMouseMove(canvasPoint)
	if (
		shapeInteractions.draggingShapeID.value ||
		shapeInteractions.resizingShapeID.value ||
		oldHover !== shapeInteractions.hoveredShapeID.value
	)
		draw()
}

function onMouseUp() {
	if (pan.isPanning.value) {
		pan.endPan()
		return
	}

	if (toolManager.selectedTool.value === 'select') {
		shapeInteractions.handleMouseUp()
		draw()
	}
}

function onMouseLeave() {
	shapeInteractions.handleMouseLeave()
}

function handleWheel(e: WheelEvent) {
	zoom.handleWheel(e, canvasRef.value!)
	draw()
}

watchEffect(() => {
	if (canvasRef.value) canvasRef.value.style.cursor = shapeInteractions.getCursor()
})
</script>
