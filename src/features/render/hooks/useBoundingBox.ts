import { compose, translate, rotate, scale, applyToPoint } from 'transformation-matrix'
import { computed, onBeforeUnmount, onMounted, type Ref, ref, watch } from 'vue'

import { rotateAroundPoint, worldToLocal } from '@/features/math/transform.ts'
import type { usePointer3DTools } from '@/features/render/hooks/usePointer3DTools.ts'
import { useShapeCore } from '@/features/render/hooks/useShapeCore.ts'
import type { useShapeSelection } from '@/features/render/hooks/useShapeSelection.ts'
import { type BoundingBox, type Box, HandleName, type HandleOption, type RawBoundingBox } from '@/features/render/types/BoundingBox.ts'
import { type Shape, ShapeType } from '@/features/render/types/Shape.ts'
import { computeBoundingBoxForShape, mergeBoundingBoxes } from '@/features/render/utils/boundingBox.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'

export function useBoundingBox(
	shapeCore: ReturnType<typeof useShapeCore>,
	selection: ReturnType<typeof useShapeSelection>,
	pointer3DTools: ReturnType<typeof usePointer3DTools>,
) {
	const BOX_OFFSET = 8
	const HANDLE_SIZE = 10
	const HANDLE_CONFIG: Record<HandleName, HandleOption> = {
		[HandleName.TL]: { x: -0.5, y: -0.5 },
		[HandleName.TR]: { x: 0.5, y: -0.5 },
		[HandleName.BR]: { x: 0.5, y: 0.5 },
		[HandleName.BL]: { x: -0.5, y: 0.5 },
		[HandleName.ROTATE]: {
			x: 0,
			y: -0.7,
			hitArea: {
				x1: -0.5,
				y1: -1,
				x2: 0.5,
				y2: -0.5,
			},
		},
		[HandleName.MOVE]: { x: 0, y: 0 },
	}

	const rawBox = ref<RawBoundingBox | null>(null)
	const visualBox = computed<BoundingBox | null>(() => {
		if (!rawBox.value) return null

		const { x1, y1, x2, y2, rotation } = rawBox.value
		const width = x2 - x1
		const height = y2 - y1
		const centerX = (x1 + x2) / 2
		const centerY = (y1 + y2) / 2

		const offset = selection.selectedShapeIDs.value.length === 1 ? 0 : BOX_OFFSET

		return {
			shapeIDs: rawBox.value.shapeIDs,
			x1: x1 - offset,
			y1: y1 - offset,
			x2: x2 + offset,
			y2: y2 + offset,
			width: width + offset * 2,
			height: height + offset * 2,
			centerX,
			centerY,
			rotation: rotation,
		}
	})

	const isDragging = ref(false)
	const isResizing = ref(false)
	const isRotating = ref(false)
	const isActive = computed(() => rawBox.value)
	const activeHandle = ref<HandleName | null>(null)
	const hoverHandle = ref<HandleName | null>(null)
	const hoveredShapeID = ref<string | null>(null)
	let initialMouse: PositionXY = { x: 0, y: 0 }
	let initialBox: BoundingBox | null = null
	const baseShapePositions = new Map<string, Box>()
	const basePointsMap = new Map<string, PositionXY[]>()
	const baseShapeRotations = new Map<string, number>()

	watch(selection.selectedShapeIDs, updateBoundingBoxFromShapes, { immediate: true })
	function updateBoundingBoxFromShapes() {
		if (selection.selectedShapeIDs.value.length === 0) {
			rawBox.value = null
		} else if (selection.selectedShapeIDs.value.length === 1) {
			const shape = shapeCore.shapeMap.value.get(selection.selectedShapeIDs.value[0])
			if (shape) {
				const box = computeBoundingBoxForShape(shape)
				rawBox.value = {
					shapeIDs: box.shapeIDs,
					x1: box.x1,
					y1: box.y1,
					x2: box.x2,
					y2: box.y2,
					rotation: shape.rotation || 0,
				}
			}
		} else {
			const selectedShapes = shapeCore.shapes.value.filter((s) => selection.selectedShapeIDs.value.includes(s.id))
			const boxes = selectedShapes.map(computeBoundingBoxForShape)
			const merged = mergeBoundingBoxes(boxes)
			if (merged) {
				rawBox.value = {
					shapeIDs: merged.shapeIDs,
					x1: merged.x1,
					y1: merged.y1,
					x2: merged.x2,
					y2: merged.y2,
					rotation: 0,
				}
			}
		}
	}

	function getBoundingBoxScreen() {
		if (!visualBox.value) return null

		const { centerX, centerY, width, height, rotation } = visualBox.value
		const center = pointer3DTools.worldToScreen({ x: centerX, y: centerY })
		const corner1 = pointer3DTools.worldToScreen({ x: centerX - width / 2, y: centerY - height / 2 })
		const corner2 = pointer3DTools.worldToScreen({ x: centerX + width / 2, y: centerY + height / 2 })
		const screenWidth = Math.abs(corner2.x - corner1.x)
		const screenHeight = Math.abs(corner2.y - corner1.y)

		return { center, screenWidth, screenHeight, rotation }
	}
	function detectHandle(worldPos: PositionXY): HandleName | null {
		if (!visualBox.value) return null

		const screenPos = pointer3DTools.worldToScreen(worldPos)
		const screenBox = getBoundingBoxScreen()
		if (!screenBox) return null

		const { center, screenWidth, screenHeight, rotation } = screenBox
		const radius = HANDLE_SIZE / 2

		const localPos = worldToLocal(screenPos, -rotation, center)

		for (const [key, handle] of Object.entries(HANDLE_CONFIG) as [HandleName, HandleOption][]) {
			if (handle.hitArea) {
				if (
					localPos.x >= handle.hitArea.x1 * screenWidth &&
					localPos.x <= handle.hitArea.x2 * screenWidth &&
					localPos.y >= handle.hitArea.y1 * screenHeight &&
					localPos.y <= handle.hitArea.y2 * screenHeight
				) {
					return key
				}
			} else {
				const px = handle.x * screenWidth
				const py = handle.y * screenHeight
				const dist = Math.hypot(localPos.x - px, localPos.y - py)
				if (dist <= radius) return key
			}
		}

		if (
			localPos.x >= -screenWidth / 2 &&
			localPos.x <= screenWidth / 2 &&
			localPos.y >= -screenHeight / 2 &&
			localPos.y <= screenHeight / 2
		) {
			return HandleName.MOVE
		}

		return null
	}
	function isPointInBoundingBox(worldPos: PositionXY) {
		if (!visualBox.value) return false
		const handle = detectHandle(worldPos)
		return Boolean(handle)
	}

	function handleMouseDown(worldPos: PositionXY, lockedShapeIDs: Ref<Set<string>>) {
		if (!rawBox.value || !visualBox.value) return

		const anyLocked = selection.selectedShapeIDs.value.some((id) => lockedShapeIDs.value.has(id))
		if (anyLocked) return

		const handle = detectHandle(worldPos)
		if (!handle) return

		activeHandle.value = handle
		setInitialState(worldPos)

		isDragging.value = handle === HandleName.MOVE
		isResizing.value = [HandleName.TL, HandleName.TR, HandleName.BR, HandleName.BL].includes(handle)
		isRotating.value = handle === HandleName.ROTATE
	}

	function setInitialState(worldPos: PositionXY) {
		if (!rawBox.value || !visualBox.value) return

		initialMouse = { ...worldPos }
		initialBox = {
			...rawBox.value,
			width: rawBox.value.x2 - rawBox.value.x1,
			height: rawBox.value.y2 - rawBox.value.y1,
			centerX: (rawBox.value.x1 + rawBox.value.x2) / 2,
			centerY: (rawBox.value.y1 + rawBox.value.y2) / 2,
			rotation: visualBox.value.rotation,
		}

		baseShapePositions.clear()
		basePointsMap.clear()
		const shapes = shapeCore.shapes.value.filter((s) => selection.selectedShapeIDs.value.includes(s.id))
		shapes.forEach((s) => {
			baseShapeRotations.set(s.id, s.rotation || 0)
			if (s.type === ShapeType.PENCIL) {
				basePointsMap.set(
					s.id,
					s.points.map((p) => ({ x: p.x, y: p.y })),
				)
			} else baseShapePositions.set(s.id, { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })
		})
	}

	const MIN_SIZE = 10

	function handleMouseMove(worldPos: PositionXY) {
		const shape = shapeCore.findShapeAtPos3D(worldPos)
		hoveredShapeID.value = shape?.id || null

		hoverHandle.value = detectHandle(worldPos)

		if (!visualBox.value || !rawBox.value || !initialBox) return

		const dx = worldPos.x - initialMouse.x
		const dy = worldPos.y - initialMouse.y

		if (isDragging.value) {
			rawBox.value = {
				...initialBox,
				shapeIDs: rawBox.value.shapeIDs,
				x1: initialBox.x1 + dx,
				y1: initialBox.y1 + dy,
				x2: initialBox.x2 + dx,
				y2: initialBox.y2 + dy,
				rotation: initialBox.rotation,
			}
		} else if (isResizing.value && activeHandle.value) {
			// TODO: use https://shihn.ca/posts/2020/resizing-rotated-elements/ this
			const localDelta = applyToPoint(compose(rotate(-initialBox.rotation)), { x: dx, y: dy })
			let { x1, y1, x2, y2 } = initialBox

			// reversed webgl Y
			switch (activeHandle.value) {
				case HandleName.TL:
					x1 += localDelta.x
					y2 += localDelta.y
					break
				case HandleName.TR:
					x2 += localDelta.x
					y2 += localDelta.y
					break
				case HandleName.BR:
					x2 += localDelta.x
					y1 += localDelta.y
					break
				case HandleName.BL:
					x1 += localDelta.x
					y1 += localDelta.y
					break
			}

			const width = x2 - x1
			const height = y2 - y1

			if (width < MIN_SIZE) {
				if (activeHandle.value.includes('l')) {
					x1 = x2 - MIN_SIZE
				} else {
					x2 = x1 + MIN_SIZE
				}
			}

			if (height < MIN_SIZE) {
				if (activeHandle.value.includes('t')) {
					y1 = y2 - MIN_SIZE
				} else {
					y2 = y1 + MIN_SIZE
				}
			}

			rawBox.value = {
				...rawBox.value,
				x1,
				y1,
				x2,
				y2,
				rotation: initialBox.rotation,
			}
		} else if (isRotating.value) {
			const centerX = (initialBox.x1 + initialBox.x2) / 2
			const centerY = (initialBox.y1 + initialBox.y2) / 2
			const angle1 = Math.atan2(initialMouse.y - centerY, initialMouse.x - centerX)
			const angle2 = Math.atan2(worldPos.y - centerY, worldPos.x - centerX)
			rawBox.value.rotation = initialBox.rotation + (angle2 - angle1)
		}

		applyTransformations(initialBox, rawBox.value)
	}
	function applyTransformations(from: RawBoundingBox, to: RawBoundingBox) {
		const shapes = shapeCore.shapes.value.filter((s) => selection.selectedShapeIDs.value.includes(s.id))

		if (isRotating.value) applyRotation(from, to, shapes)
		else {
			const matrix = calculateMatrix(from, to)
			shapes.forEach((s) => {
				if (s.type === ShapeType.PENCIL) {
					const base = basePointsMap.get(s.id)
					if (!base) return
					s.points = base.map((p) => applyToPoint(matrix, p))
				} else {
					const base = baseShapePositions.get(s.id)
					if (!base) return
					const p1 = applyToPoint(matrix, { x: base.x1, y: base.y1 })
					const p2 = applyToPoint(matrix, { x: base.x2, y: base.y2 })
					s.x1 = p1.x
					s.y1 = p1.y
					s.x2 = p2.x
					s.y2 = p2.y
				}

				const deltaRotation = to.rotation - from.rotation
				const initialRotation = baseShapeRotations.get(s.id) ?? 0
				s.rotation = initialRotation + deltaRotation

				shapeCore.scheduleSync(s)
			})
		}
	}
	function applyRotation(from: RawBoundingBox, to: RawBoundingBox, shapes: Shape[]) {
		const deltaAngle = to.rotation - from.rotation
		const center = {
			x: (from.x1 + from.x2) / 2,
			y: (from.y1 + from.y2) / 2,
		}

		shapes.forEach((s) => {
			if (s.type === ShapeType.PENCIL) {
				const base = basePointsMap.get(s.id)
				if (!base) return

				s.points = base.map((p) => rotateAroundPoint(p, deltaAngle, center))
				s.rotation = (baseShapeRotations.get(s.id) ?? 0) + deltaAngle
			} else {
				const base = baseShapePositions.get(s.id)
				if (!base) return

				const baseCenter = {
					x: (base.x1 + base.x2) / 2,
					y: (base.y1 + base.y2) / 2,
				}

				const rotated = rotateAroundPoint(baseCenter, deltaAngle, center)

				const halfW = (base.x2 - base.x1) / 2
				const halfH = (base.y2 - base.y1) / 2

				s.x1 = rotated.x - halfW
				s.x2 = rotated.x + halfW
				s.y1 = rotated.y - halfH
				s.y2 = rotated.y + halfH

				s.rotation = (baseShapeRotations.get(s.id) ?? 0) + deltaAngle
			}

			shapeCore.scheduleSync(s)
		})
	}
	function calculateMatrix(from: RawBoundingBox, to: RawBoundingBox) {
		const scaleX = (to.x2 - to.x1) / (from.x2 - from.x1)
		const scaleY = (to.y2 - to.y1) / (from.y2 - from.y1)

		const centerFrom = {
			x: (from.x1 + from.x2) / 2,
			y: (from.y1 + from.y2) / 2,
		}
		const centerTo = {
			x: (to.x1 + to.x2) / 2,
			y: (to.y1 + to.y2) / 2,
		}
		const translateX = centerTo.x - centerFrom.x
		const translateY = centerTo.y - centerFrom.y

		return compose(
			translate(translateX, translateY),
			translate(centerFrom.x, centerFrom.y),
			scale(scaleX, scaleY),
			translate(-centerFrom.x, -centerFrom.y),
		)
	}

	function handleMouseUp() {
		reset()
	}

	function handleEscape() {
		if (isRotating.value) {
			const shapes = shapeCore.shapes.value.filter((s) => selection.selectedShapeIDs.value.includes(s.id))
			shapes.forEach((s) => {
				s.rotation = 0
				shapeCore.scheduleSync(s)
			})
		}
		reset()
		rawBox.value = null
	}

	function reset() {
		if (!visualBox.value) return
		isDragging.value = false
		isResizing.value = false
		isRotating.value = false
		activeHandle.value = null
		hoverHandle.value = null
		hoveredShapeID.value = null
		initialBox = null
	}

	function getCursor() {
		const handle = activeHandle.value || hoverHandle.value
		if (handle) {
			switch (handle) {
				case HandleName.ROTATE:
					return 'crosshair'
				case HandleName.MOVE:
					return 'move'
				// grab
				case HandleName.TL:
				case HandleName.BR:
					return 'nwse-resize'
				case HandleName.TR:
				case HandleName.BL:
					return 'nesw-resize'
				default:
					return 'default'
			}
		}

		if (hoveredShapeID.value) return 'pointer'
		if (isDragging.value) return 'grabbing'

		return 'default'
	}

	const unloadHandler = async () => {
		await shapeCore.saveShapesByIDs(selection.selectedShapeIDs.value)
	}
	onMounted(() => window.addEventListener('beforeunload', unloadHandler))
	onBeforeUnmount(() => {
		window.removeEventListener('beforeunload', unloadHandler)
	})

	return {
		BOX_OFFSET,
		HANDLE_SIZE,
		HANDLE_CONFIG,
		rawBox,
		visualBox,
		isDragging,
		isResizing,
		isRotating,
		isActive,
		initialMouse,
		initialBox,
		activeHandle,
		hoverHandle,
		hoveredShapeID,
		getBoundingBoxScreen,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		handleEscape,
		isPointInBoundingBox,
		getCursor,
	}
}
