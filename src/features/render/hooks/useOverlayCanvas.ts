import * as THREE from 'three'
import { onBeforeUnmount, onMounted, type Ref, watch } from 'vue'
import type { Awareness } from 'y-protocols/awareness'

import { localToWorld } from '@/features/math/transform.ts'
import { type useBoundingBox } from '@/features/render/hooks/useBoundingBox.ts'
import type { usePointer3DTools } from '@/features/render/hooks/usePointer3DTools.ts'
import type { useShapeCore } from '@/features/render/hooks/useShapeCore.ts'
import type { useShapeSelection } from '@/features/render/hooks/useShapeSelection.ts'
import type { Shape } from '@/features/render/types/Shape.ts'
import { computeBoundingBoxForShape } from '@/features/render/utils/boundingBox.ts'
import type { useRemoteCursors } from '@/features/sync/useRemoteCursors.ts'
import type { useRemoteSelection } from '@/features/sync/useRemoteSelection.ts'
import { COLORS } from '@/shared/constants/colors.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'

export function useOverlayCanvas(
	overlayRef: Ref<HTMLCanvasElement | undefined>,
	containerRef: Ref<HTMLElement | undefined>,
	cameraRef: Ref<THREE.OrthographicCamera | null>,
	pointer3DTools: ReturnType<typeof usePointer3DTools>,
	shapeCore: ReturnType<typeof useShapeCore>,
	remoteCursors: ReturnType<typeof useRemoteCursors>,
	selection: ReturnType<typeof useShapeSelection>,
	boundingBox: ReturnType<typeof useBoundingBox>,
	remoteSelection: ReturnType<typeof useRemoteSelection>,
	provider: { awareness: Awareness },
) {
	let overlayCtx: CanvasRenderingContext2D | null = null

	let needsDraw = false
	let animationFrameID: number | null = null
	function requestDraw() {
		if (!needsDraw) {
			needsDraw = true
			animationFrameID = requestAnimationFrame(() => {
				drawOverlay()
				animationFrameID = null
			})
		}
	}

	watch(
		() => remoteCursors.otherCursors.value,
		() => {
			requestDraw()
		},
		{ deep: true },
	)
	watch(
		remoteSelection.remoteBoxes,
		() => {
			requestDraw()
		},
		{ deep: true },
	)

	function drawOverlay() {
		if (!overlayCtx || !cameraRef.value || !containerRef.value) return

		const ctx = overlayCtx
		clearOverlay()

		if (boundingBox.hoveredShapeID.value && !boundingBox.isActive.value) {
			const shape = shapeCore.shapeMap.value.get(boundingBox.hoveredShapeID.value)
			if (shape) drawHighlight(ctx, shape)
		}

		if (boundingBox.isActive.value) {
			drawHandles(ctx)
			drawBoundingBox(ctx)
		}
		drawSelectionBox(ctx)
		drawRemoteSelectionBoxes(ctx)
		drawRemoteBoundingBoxes(ctx)

		remoteCursors.drawCursors(ctx, pointer3DTools.worldToScreen)

		needsDraw = false
	}
	function clearOverlay() {
		if (!overlayCtx || !containerRef.value) return
		overlayCtx.clearRect(0, 0, containerRef.value.clientWidth, containerRef.value.clientHeight)
	}

	function drawHandles(ctx: CanvasRenderingContext2D) {
		const screenBox = boundingBox.getBoundingBoxScreen()
		if (!screenBox) return

		const radius = boundingBox.HANDLE_SIZE / 2
		const { center, screenWidth, screenHeight, rotation } = screenBox
		const handles = [
			{ x: -screenWidth / 2, y: -screenHeight / 2 },
			{ x: screenWidth / 2, y: -screenHeight / 2 },
			{ x: screenWidth / 2, y: screenHeight / 2 },
			{ x: -screenWidth / 2, y: screenHeight / 2 },
			{ x: 0, y: -screenHeight / 2 - 30 },
		]

		ctx.save()
		ctx.translate(center.x, center.y)
		ctx.rotate(-rotation)

		for (const [i, handle] of handles.entries()) {
			const sx = handle.x
			const sy = handle.y

			ctx.save()
			ctx.shadowColor = COLORS.overlay.handle.shadow
			ctx.shadowBlur = 4
			ctx.fillStyle = i === 4 ? COLORS.overlay.handle.rotation : COLORS.overlay.handle.fill
			ctx.beginPath()
			ctx.arc(sx, sy, radius, 0, Math.PI * 2)
			ctx.fill()
			ctx.restore()

			ctx.strokeStyle = COLORS.overlay.handle.stroke
			ctx.lineWidth = 1
			ctx.beginPath()
			ctx.arc(sx, sy, radius, 0, Math.PI * 2)
			ctx.stroke()
		}

		ctx.restore()
	}

	function drawHighlight(ctx: CanvasRenderingContext2D, shape: Shape) {
		const box = computeBoundingBoxForShape(shape)

		const { x1, y1, x2, y2, rotation } = box

		const width = x2 - x1
		const height = y2 - y1
		const centerX = (x1 + x2) / 2
		const centerY = (y1 + y2) / 2

		const cornersLocal: PositionXY[] = [
			{ x: -width / 2, y: -height / 2 },
			{ x: width / 2, y: -height / 2 },
			{ x: width / 2, y: height / 2 },
			{ x: -width / 2, y: height / 2 },
		]

		const cornersWorld = cornersLocal.map((c) => localToWorld(c, rotation, { x: centerX, y: centerY }))

		ctx.fillStyle = COLORS.overlay.highlight.fill
		ctx.beginPath()
		cornersWorld.forEach(({ x, y }, i) => {
			const screenPos = pointer3DTools.worldToScreen({ x, y })
			if (i === 0) ctx.moveTo(screenPos.x, screenPos.y)
			else ctx.lineTo(screenPos.x, screenPos.y)
		})
		ctx.closePath()
		ctx.fill()
	}

	function drawBoundingBox(ctx: CanvasRenderingContext2D) {
		const screenBox = boundingBox.getBoundingBoxScreen()
		if (!screenBox) return

		const { center, screenWidth, screenHeight, rotation } = screenBox

		ctx.save()
		ctx.translate(center.x, center.y)
		ctx.rotate(-rotation)

		ctx.lineWidth = 1
		ctx.setLineDash([4, 4])
		ctx.strokeStyle = COLORS.overlay.boundingBox.stroke
		ctx.strokeRect(-screenWidth / 2, -screenHeight / 2, screenWidth, screenHeight)

		ctx.fillStyle = COLORS.overlay.boundingBox.fill
		ctx.fillRect(-screenWidth / 2, -screenHeight / 2, screenWidth, screenHeight)

		ctx.restore()
	}

	function drawRemoteBoundingBoxes(ctx: CanvasRenderingContext2D) {
		for (const [_, box] of Object.entries(remoteSelection.remoteBoxes.value)) {
			const { x1, y1, x2, y2, rotation } = box

			const width = x2 - x1
			const height = y2 - y1
			const centerX = (x1 + x2) / 2
			const centerY = (y1 + y2) / 2

			const cornersLocal = [
				{ x: -width / 2, y: -height / 2 },
				{ x: width / 2, y: -height / 2 },
				{ x: width / 2, y: height / 2 },
				{ x: -width / 2, y: height / 2 },
			]

			const cornersWorld = cornersLocal.map((c) => localToWorld(c, rotation, { x: centerX, y: centerY }))

			ctx.beginPath()
			cornersWorld.forEach(({ x, y }, i) => {
				const screenPos = pointer3DTools.worldToScreen({ x, y })
				if (i === 0) ctx.moveTo(screenPos.x, screenPos.y)
				else ctx.lineTo(screenPos.x, screenPos.y)
			})
			ctx.closePath()

			ctx.strokeStyle = COLORS.overlay.remoteBoundingBox.stroke
			ctx.lineWidth = 1
			ctx.setLineDash([4, 4])
			ctx.stroke()
			ctx.setLineDash([])
		}
	}

	function drawSelectionBox(ctx: CanvasRenderingContext2D) {
		if (!selection.isDragging.value || !selection.dragStart.value || !selection.dragCurrent.value) return

		const pos1 = pointer3DTools.worldToScreen(selection.dragStart.value)
		const pos2 = pointer3DTools.worldToScreen(selection.dragCurrent.value)

		const left = Math.min(pos1.x, pos2.x)
		const top = Math.min(pos1.y, pos2.y)
		const width = Math.abs(pos2.x - pos1.x)
		const height = Math.abs(pos2.y - pos1.y)

		ctx.strokeStyle = COLORS.overlay.selection.stroke
		ctx.lineWidth = 1
		ctx.setLineDash([5, 5])
		ctx.strokeRect(left, top, width, height)
		ctx.setLineDash([])
		ctx.fillStyle = COLORS.overlay.selection.fill
		ctx.fillRect(left, top, width, height)
	}

	function drawRemoteSelectionBoxes(ctx: CanvasRenderingContext2D) {
		const states = provider.awareness.getStates()
		for (const [clientID, state] of states.entries()) {
			if (clientID !== provider.awareness.clientID && state.selectionBox) {
				const { start, current } = state.selectionBox
				if (start && current) {
					const pos1 = pointer3DTools.worldToScreen(start)
					const pos2 = pointer3DTools.worldToScreen(current)

					const left = Math.min(pos1.x, pos2.x)
					const top = Math.min(pos1.y, pos2.y)
					const width = Math.abs(pos2.x - pos1.x)
					const height = Math.abs(pos2.y - pos1.y)

					ctx.strokeStyle = COLORS.overlay.remoteSelection.stroke
					ctx.lineWidth = 2
					ctx.setLineDash([5, 5])
					ctx.strokeRect(left, top, width, height)
					ctx.setLineDash([])
				}
			}
		}
	}

	function resizeOverlay() {
		if (!overlayRef.value || !containerRef.value) return
		const w = containerRef.value.clientWidth
		const h = containerRef.value.clientHeight
		overlayRef.value.width = w
		overlayRef.value.height = h
		drawOverlay()
	}
	onMounted(() => {
		overlayCtx = overlayRef.value!.getContext('2d')
		resizeOverlay()
		window.addEventListener('resize', resizeOverlay)
	})
	onBeforeUnmount(() => {
		if (animationFrameID) cancelAnimationFrame(animationFrameID)
		window.removeEventListener('resize', resizeOverlay)
	})

	return {
		drawOverlay,
		requestDraw,
	}
}
