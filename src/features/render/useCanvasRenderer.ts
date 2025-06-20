import { type Ref } from 'vue'

import type { Shape } from '@/features/render/types/Shape.ts'
import { useCanvasZoom } from '@/features/render/useCanvasZoom.ts'
import { useShapeInteractions } from '@/features/render/useShapeInteractions.ts'
import { useRemoteCursors } from '@/features/sync/useRemoteCursors.ts'
import { lightenColor, shadeColor } from '@/shared/utils/colors.ts'

interface Dependencies {
	shapes: Ref<Shape[]>
	zoom: ReturnType<typeof useCanvasZoom>
	shapeInteractions: ReturnType<typeof useShapeInteractions>
	remoteCursors: ReturnType<typeof useRemoteCursors>
}

export function useCanvasRenderer(
	canvasRef: Ref<HTMLCanvasElement | undefined>,
	{ shapes, zoom, shapeInteractions, remoteCursors }: Dependencies,
) {
	function draw() {
		if (!canvasRef.value) return

		const ctx = canvasRef.value.getContext('2d')!
		ctx.resetTransform()
		ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
		applyTransform(ctx)

		drawShapes(ctx)
		remoteCursors.drawCursors(ctx)
	}

	function resizeCanvas() {
		if (!canvasRef.value) return
		const rect = canvasRef.value.getBoundingClientRect()
		const dpi = window.devicePixelRatio || 1
		canvasRef.value.width = rect.width * dpi
		canvasRef.value.height = rect.height * dpi
		const ctx = canvasRef.value.getContext('2d')
		if (ctx) ctx.scale(dpi, dpi)
		draw()
	}

	function applyTransform(ctx: CanvasRenderingContext2D) {
		ctx.setTransform(zoom.scale.value, 0, 0, zoom.scale.value, zoom.offset.value.x, zoom.offset.value.y)
	}

	function drawMarkers(ctx: CanvasRenderingContext2D, shape: Shape) {
		const radius = shapeInteractions.HANDLE_SIZE / 2
		for (const { x, y } of shapeInteractions.computeHandles(shape)) {
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
			const isLocked = shapeInteractions.lockedShapeIDs.value.includes(shape.id)
			const isActive =
				!isLocked &&
				[
					shapeInteractions.draggingShapeID.value,
					shapeInteractions.resizingShapeID.value,
					shapeInteractions.hoveredShapeID.value,
				].includes(shape.id)

			// fill
			if (isLocked) {
				ctx.fillStyle = `rgba(168, 200, 212, 0.4)`
			} else {
				ctx.fillStyle = isActive ? lightenColor(shape.color!) : shape.color!
			}
			ctx.fillRect(shape.x, shape.y, shape.width, shape.height)

			// border
			if (isLocked) {
				ctx.strokeStyle = 'rgba(255,0,0,0.31)'
				ctx.lineWidth = 2
				ctx.setLineDash([5, 3])
			} else {
				ctx.strokeStyle = shadeColor(shape.color!)
				ctx.lineWidth = 1
				ctx.setLineDash([])
			}

			ctx.strokeRect(shape.x, shape.y, shape.width, shape.height)

			if (isActive) {
				// more border
				ctx.strokeStyle = shadeColor(shape.color!)
				ctx.lineWidth = 2
				ctx.setLineDash([])
				ctx.strokeRect(shape.x, shape.y, shape.width, shape.height)
				drawMarkers(ctx, shape)
			}
		}
	}

	return {
		resizeCanvas,
		draw,
	}
}
