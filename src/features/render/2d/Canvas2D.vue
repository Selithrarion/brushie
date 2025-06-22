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

import { getPos2D } from '@/features/render/2d/getPos2D.ts'
import { useCanvasRenderer } from '@/features/render/2d/useCanvasRenderer.ts'
import { usePan2D } from '@/features/render/2d/usePan2D.ts'
import { useShapeCoreOld } from '@/features/render/2d/useShapeCoreOld.ts'
import { useZoom2D } from '@/features/render/2d/useZoom2D.ts'
import { useToolManager } from '@/features/render/hooks/useToolManager.ts'
import { ToolName } from '@/features/render/types/Tool.ts'
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
const zoom = useZoom2D()
const pan = usePan2D(zoom)
const remoteCursors = useRemoteCursors(provider)
const shapeCore = useShapeCoreOld()
const renderer = useCanvasRenderer(canvasRef, { shapes, zoom, shapeCore, remoteCursors })

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
	const p = getPos2D($event, canvasRef.value!)
	const worldPos = zoom.getWorldPos2D(p)
	const shape = shapeCore.findShapeAtPos(worldPos)

	const isLocked = shape && shapeCore.lockedShapeIDs.value.includes(shape.id)
	if (isLocked) return

	if (shape) {
		menu.openAtPosition($event.clientX, $event.clientY, [{ label: 'Delete', action: () => shapeCore.deleteShape(shape.id) }])
	} else {
		menu.openAtPosition($event.clientX, $event.clientY, [{ label: 'Create shape', action: () => shapeCore.createShape(worldPos) }])
	}
}

function handleGlobalMouseUp() {
	if (toolManager.selectedTool.value === ToolName.SELECT) {
		shapeCore.handleMouseUp()
		pan.endPan()
		draw()
	}
}

function handleGlobalMouseLeave() {
	if (toolManager.selectedTool.value === ToolName.SELECT) {
		shapeCore.handleMouseLeave()
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

	const p = getPos2D($event, canvasRef.value!)
	const worldPos = zoom.getWorldPos2D(p)

	switch (toolManager.selectedTool.value) {
		case ToolName.SELECT:
			const shape = shapeCore.findShapeAtPos(worldPos)
			if (shape) shapeCore.handleMouseDown(worldPos, shape)
			else pan.startPan(p)
			break
		case 'rect':
			shapeCore.createShape({ x1: worldPos.x, y1: worldPos.y })
			break
		case 'ellipse':
			shapeCore.createShape({ x1: worldPos.x, y1: worldPos.y })
			break
		case 'line':
			shapeCore.createShape({ x1: worldPos.x, y1: worldPos.y })
			break
		case 'delete': {
			const shape = shapeCore.findShapeAtPos(worldPos)
			if (shape && !shapeCore.lockedShapeIDs.value.includes(shape.id)) shapeCore.deleteShape(shape.id)
			break
		}
	}

	draw()
}

function onMouseMove(e: MouseEvent) {
	if (menu.visible.value) return

	if (pan.updatePan({ x: e.clientX, y: e.clientY })) {
		draw()
		return
	}

	const p = getPos2D(e, canvasRef.value!)
	const worldPos = zoom.getWorldPos2D(p)
	remoteCursors.updateCursor(worldPos)

	const oldHover = shapeCore.hoveredShapeID.value
	if (toolManager.selectedTool.value === ToolName.SELECT) shapeCore.handleMouseMove(worldPos)
	if (shapeCore.activeShapeID.value || oldHover !== shapeCore.hoveredShapeID.value) draw()
}

function onMouseUp() {
	if (pan.isPanning.value) {
		pan.endPan()
		return
	}

	if (toolManager.selectedTool.value === ToolName.SELECT) {
		shapeCore.handleMouseUp()
		draw()
	}
}

function onMouseLeave() {
	shapeCore.handleMouseLeave()
}

function handleWheel(e: WheelEvent) {
	zoom.handleWheel(e, canvasRef.value!)
	draw()
}

watchEffect(() => {
	if (canvasRef.value) canvasRef.value.style.cursor = shapeCore.getCursor()
})
</script>
