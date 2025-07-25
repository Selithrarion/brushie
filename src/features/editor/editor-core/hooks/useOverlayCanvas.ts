import { useEventListener } from '@vueuse/core'
import gsap from 'gsap'
import * as THREE from 'three'
import { onMounted, ref, type Ref, watch } from 'vue'
import type { Awareness } from 'y-protocols/awareness'

import type { usePointer3DTools } from '@/features/editor/editor-core/hooks/usePointer3DTools.ts'
import type { useZoom3D } from '@/features/editor/editor-core/hooks/useZoom3D.ts'
import { type useBoundingBox } from '@/features/editor/editor-shapes/hooks/useBoundingBox.ts'
import type { useShapeCore } from '@/features/editor/editor-shapes/hooks/useShapeCore.ts'
import type { useShapeSelection } from '@/features/editor/editor-shapes/hooks/useShapeSelection.ts'
import { AWARENESS_SELECTION_KEY } from '@/features/editor/edtitor-sync/constants/awareness.consts.ts'
import type { useRemoteCursors } from '@/features/editor/edtitor-sync/useRemoteCursors.ts'
import type { useRemoteSelection } from '@/features/editor/edtitor-sync/useRemoteSelection.ts'
import { type ArrowShape, type LineShape, ShapeType } from '@/features/editor/types/shape.types.ts'
import { localToWorld } from '@/features/math/transform.ts'
import { COLORS } from '@/shared/constants/colors.ts'

export function useOverlayCanvas(
	overlayRef: Ref<HTMLCanvasElement | null>,
	containerRef: Ref<HTMLElement | null>,
	camera: Ref<THREE.OrthographicCamera | null>,
	pointer3DTools: ReturnType<typeof usePointer3DTools>,
	shapeCore: ReturnType<typeof useShapeCore>,
	remoteCursors: ReturnType<typeof useRemoteCursors>,
	selection: ReturnType<typeof useShapeSelection>,
	boundingBox: ReturnType<typeof useBoundingBox>,
	remoteSelection: ReturnType<typeof useRemoteSelection>,
	zoom: ReturnType<typeof useZoom3D>,
	provider: { awareness: Awareness },
) {
	let overlayCtx: CanvasRenderingContext2D | null = null

	let needsDraw = false
	function requestDraw() {
		needsDraw = true
	}

	const boundingBoxScale = ref(1)
	const lineHandleScale = ref(1)
	watch(
		() => boundingBox.rawBox.value?.shapeIDs,
		(ids) => {
			if (ids && ids.length) {
				const firstID = ids[0]
				const shape = shapeCore.shapeMap.get(firstID)
				if (!shape) return

				if ([ShapeType.LINE, ShapeType.ARROW].includes(shape.type)) animateScale(lineHandleScale, 1, 1.05)
				else animateScale(boundingBoxScale, 1, 1.1)
			} else {
				animateScale(boundingBoxScale, boundingBoxScale.value, 1)
				animateScale(lineHandleScale, boundingBoxScale.value, 1)
			}
		},
	)
	function animateScale(target: Ref<number>, startValue: number, endValue: number) {
		gsap.fromTo(
			target,
			{ value: startValue },
			{
				value: endValue,
				duration: 0.15,
				yoyo: true,
				repeat: 1,
				onUpdate: () => requestDraw(),
			},
		)
	}

	watch(
		remoteSelection.remoteBoxes,
		() => {
			requestDraw()
		},
		{ deep: true },
	)

	function drawOverlay() {
		if (!overlayCtx || !camera.value || !containerRef.value) return

		const ctx = overlayCtx
		clearOverlay()

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
		const selectedShapeID = boundingBox.rawBox.value?.shapeIDs?.[0]
		if (!selectedShapeID) return
		const shape = shapeCore.shapeMap.get(selectedShapeID)
		if (!shape) return

		const isSingleShape = boundingBox.rawBox.value?.shapeIDs.length === 1
		if (isSingleShape && (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW)) {
			drawLineHandles(ctx, shape)
		} else drawBoxHandles(ctx)
	}
	function drawLineHandles(ctx: CanvasRenderingContext2D, shape: ArrowShape | LineShape) {
		const radius = boundingBox.HANDLE_SIZE / 2

		const distance = Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1)
		const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1)
		const offsetAmount = (distance * (lineHandleScale.value - 1)) / 2

		const p1Screen = pointer3DTools.worldToScreen({
			x: shape.x1 - Math.cos(angle) * offsetAmount,
			y: shape.y1 - Math.sin(angle) * offsetAmount,
		})
		const p2Screen = pointer3DTools.worldToScreen({
			x: shape.x2 + Math.cos(angle) * offsetAmount,
			y: shape.y2 + Math.sin(angle) * offsetAmount,
		})

		const points = [p1Screen, p2Screen]
		points.forEach((p) => {
			ctx.save()
			ctx.scale(boundingBoxScale.value, boundingBoxScale.value)

			ctx.shadowColor = COLORS.overlay.handle.shadow
			ctx.shadowBlur = 4
			ctx.fillStyle = COLORS.overlay.handle.fill
			ctx.beginPath()
			ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
			ctx.fill()
			ctx.restore()

			ctx.strokeStyle = COLORS.overlay.handle.stroke
			ctx.lineWidth = 1
			ctx.beginPath()
			ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
			ctx.stroke()
		})
	}
	function drawBoxHandles(ctx: CanvasRenderingContext2D) {
		const screenBox = boundingBox.getBoundingBoxScreen()
		if (!screenBox) return

		const radius = boundingBox.HANDLE_SIZE / 2
		const { center, screenWidth, screenHeight, rotation } = screenBox!

		const handles = [
			{ x: -screenWidth / 2, y: -screenHeight / 2 },
			{ x: screenWidth / 2, y: -screenHeight / 2 },
			{ x: screenWidth / 2, y: screenHeight / 2 },
			{ x: -screenWidth / 2, y: screenHeight / 2 },
			{ x: 0, y: -screenHeight / 2 - 30 },
		]

		ctx.save()
		ctx.translate(center.x, center.y)
		ctx.scale(boundingBoxScale.value, boundingBoxScale.value)
		ctx.rotate(-rotation)

		for (const [i, handle] of handles.entries()) {
			ctx.save()
			ctx.shadowColor = COLORS.overlay.handle.shadow
			ctx.shadowBlur = 4
			ctx.fillStyle = i === 4 ? COLORS.overlay.handle.rotation : COLORS.overlay.handle.fill
			ctx.beginPath()
			ctx.arc(handle.x, handle.y, radius, 0, Math.PI * 2)
			ctx.fill()
			ctx.restore()

			ctx.strokeStyle = COLORS.overlay.handle.stroke
			ctx.lineWidth = 1
			ctx.beginPath()
			ctx.arc(handle.x, handle.y, radius, 0, Math.PI * 2)
			ctx.stroke()
		}

		ctx.restore()
	}

	function drawBoundingBox(ctx: CanvasRenderingContext2D) {
		if (isLineBoundingBox()) return

		const screenBox = boundingBox.getBoundingBoxScreen()
		if (!screenBox) return
		const { center, screenWidth, screenHeight, rotation } = screenBox

		ctx.save()
		ctx.translate(center.x, center.y)
		ctx.scale(boundingBoxScale.value, boundingBoxScale.value)
		ctx.rotate(-rotation)

		ctx.lineWidth = 1
		ctx.setLineDash([4, 4])
		ctx.strokeStyle = COLORS.overlay.boundingBox.stroke
		ctx.strokeRect(-screenWidth / 2, -screenHeight / 2, screenWidth, screenHeight)

		ctx.fillStyle = COLORS.overlay.boundingBox.fill
		ctx.fillRect(-screenWidth / 2, -screenHeight / 2, screenWidth, screenHeight)

		ctx.restore()
	}
	function isLineBoundingBox() {
		const selectedShapeIDs = boundingBox.rawBox.value?.shapeIDs
		if (!selectedShapeIDs) return

		const shape = shapeCore.shapeMap.get(selectedShapeIDs[0])
		if (!shape) return

		return selectedShapeIDs.length === 1 && (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW)
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
			if (clientID !== provider.awareness.clientID && state[AWARENESS_SELECTION_KEY]) {
				const { start, current } = state[AWARENESS_SELECTION_KEY]
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

	function animateSnapDots() {
		gsap.to(window, {
			opacity: 1,
			duration: 1,
			ease: 'power1.out',
			overwrite: true,
		})
	}
	watch(
		() => zoom.scale.value,
		() => {
			animateSnapDots()
		},
	)

	useEventListener(window, 'resize', resizeOverlay)
	function resizeOverlay() {
		if (!overlayRef.value || !containerRef.value) return
		const w = containerRef.value.clientWidth
		const h = containerRef.value.clientHeight
		const dpr = window.devicePixelRatio || 1
		overlayRef.value.width = w * dpr
		overlayRef.value.height = h * dpr
		overlayRef.value.style.width = w + 'px'
		overlayRef.value.style.height = h + 'px'
		overlayCtx = overlayRef.value!.getContext('2d')
		if (overlayCtx) overlayCtx.scale(dpr, dpr)
		drawOverlay()
	}
	onMounted(() => {
		overlayCtx = overlayRef.value!.getContext('2d')
		resizeOverlay()
	})

	return {
		drawOverlay,
		requestDraw,
		needsDraw,
	}
}
