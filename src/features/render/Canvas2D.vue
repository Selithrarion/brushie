<template>
	<div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-100 via-pink-100 to-green-100 p-6">
		<div class="rounded-xl border border-white/80 bg-white/40 p-4 backdrop-blur-md">
			<canvas
				class="h-auto w-full"
				ref="canvas"
				width="800"
				height="600"
				@mousedown="onMouseDown"
				@mouseup="onMouseUp"
				@mousemove="onMouseMove"
				@mouseleave="onMouseLeave"
			/>
			<div class="mt-3 text-sm text-gray-700">
				<p>Status: {{ status }}</p>
				<p>Peers: {{ peersCount }}</p>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue'

import type { Shape } from '@/features/render/Shape.ts'
import { useShapeInteractions } from '@/features/render/useShapeInteractions.ts'
import { useRemoteCursors } from '@/features/sync/useRemoteCursors.ts'
import { useYShapes } from '@/features/sync/useYShapes.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'
import { lightenColor, shadeColor } from '@/shared/utils/colors.ts'

const canvas = ref<HTMLCanvasElement | null>(null)

const { provider, shapes, peersCount, status } = useYShapes()

const {
	HANDLE_SIZE,
	draggingShapeID,
	resizingShapeID,
	hoveredShapeID,
	handleMouseDown,
	handleMouseMove,
	handleMouseUp,
	handleMouseLeave,
	computeHandles,
	getCursor,
} = useShapeInteractions()

const { drawCursors, updateCursor } = useRemoteCursors(provider)

function drawMarkers(ctx: CanvasRenderingContext2D, shape: Shape) {
	const radius = HANDLE_SIZE / 2

	for (const { x, y } of computeHandles(shape)) {
		ctx.shadowColor = shadeColor(shape.color!, 60)
		ctx.shadowBlur = 4

		ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
		ctx.beginPath()
		ctx.arc(x, y, radius, 0, Math.PI * 2)
		ctx.fill()

		ctx.shadowBlur = 0
		ctx.strokeStyle = shadeColor(shape.color!, 50)
		ctx.lineWidth = 1.2
		ctx.beginPath()
		ctx.arc(x, y, radius, 0, Math.PI * 2)
		ctx.stroke()
	}
}

function drawShapes(ctx: CanvasRenderingContext2D) {
	for (const shape of shapes.value) {
		const isActive = [draggingShapeID.value, resizingShapeID.value, hoveredShapeID.value].includes(shape.id)

		// fill
		ctx.fillStyle = isActive ? lightenColor(shape.color!) : shape.color!
		ctx.fillRect(shape.x, shape.y, shape.width, shape.height)

		// border
		ctx.strokeStyle = shadeColor(shape.color!)
		ctx.lineWidth = 1
		ctx.strokeRect(shape.x, shape.y, shape.width, shape.height)

		if (isActive) {
			// more border
			ctx.strokeStyle = shadeColor(shape.color!)
			ctx.lineWidth = 2
			ctx.strokeRect(shape.x, shape.y, shape.width, shape.height)

			drawMarkers(ctx, shape)
		}
	}
}
function draw() {
	if (!canvas.value) return
	const ctx = canvas.value.getContext('2d')!
	ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)

	drawShapes(ctx)
	drawCursors(ctx)
}

function pos(e: MouseEvent) {
	const el = canvas.value!
	const rect = el.getBoundingClientRect()

	const scaleX = el.width / rect.width
	const scaleY = el.height / rect.height

	return {
		x: (e.clientX - rect.left) * scaleX,
		y: (e.clientY - rect.top) * scaleY,
	}
}

function onMouseDown(e: MouseEvent) {
	handleMouseDown(pos(e))
	draw()
}

function onMouseMove(e: MouseEvent) {
	const p = pos(e)
	updateCursor(p)
	const oldHover = hoveredShapeID.value
	handleMouseMove(p)
	if (draggingShapeID.value || resizingShapeID.value || oldHover !== hoveredShapeID.value) {
		draw()
	}
}

async function onMouseUp() {
	await handleMouseUp()
	draw()
}
function onMouseLeave() {
	handleMouseLeave()
}

watchEffect(() => {
	if (canvas.value) canvas.value.style.cursor = getCursor()
})

let isInitialized = false
watchEffect(() => {
	if (!isInitialized && shapes.value.length === 0) return
	draw()
	isInitialized = true
})
</script>
