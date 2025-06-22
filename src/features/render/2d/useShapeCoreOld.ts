import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'

import { getPointToSegmentDistance } from '@/features/math/geometry.ts'
import { localToWorld } from '@/features/math/transform.ts'
import { useLockedShapes } from '@/features/render/2d/useLockedShapes.ts'
import type { usePointer3DTools } from '@/features/render/hooks/usePointer3DTools.ts'
import { type ArrowShape, type EllipseShape, type LineShape, type RectShape, type Shape, ShapeType } from '@/features/render/types/Shape.ts'
import { YShapeTransactions } from '@/features/sync/types/transactions.ts'
import { useYShapes } from '@/features/sync/useYShapes.ts'
import { saveShapeDB } from '@/shared/services/database.service.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'
import { getRandomPastelColor } from '@/shared/utils/colors.ts'

const MIN_SHAPE_SIZE = 10
const HANDLE_SIZE = 10

// export enum HandleName {
// 	TL = 'tl',
// 	TR = 'tr',
// 	BL = 'bl',
// 	BR = 'br',
// 	ROTATE = 'rotate',
// 	START = 'start',
// 	MID = 'mid',
// 	END = 'end'
// }
export type HandleName = 'tl' | 'tr' | 'br' | 'bl' | 'rotate' | 'start' | 'mid' | 'end'

interface Handle {
	x: number
	y: number
	name: HandleName
}

export type CreateShapeFn = (options: CreateShapeOptions) => Shape

export interface CreateShapeOptions {
	type?: ShapeType
	color?: string
	rotation?: number
	x1?: number
	y1?: number
	x2?: number
	y2?: number
	arrowSize?: number
	// 	TODO: only for pencil
	points?: PositionXY[]
	lineWidth?: number
}

export enum ResizeType {
	RECT = 'RECT',
	LINE = 'LINE',
}

interface ResizeDataRect {
	type: ResizeType.RECT
	shapeID: string
	handle: HandleName
	startX1: number
	startY1: number
	startX2: number
	startY2: number
	mouseX: number
	mouseY: number
}

interface ResizeDataLine {
	type: ResizeType.LINE
	shapeID: string
	handle: HandleName
	startX1: number
	startY1: number
	startX2: number
	startY2: number
	mouseX: number
	mouseY: number
}

type ResizeData = ResizeDataRect | ResizeDataLine

interface DragDataLine {
	shapeID: string
	startX1: number
	startY1: number
	startX2: number
	startY2: number
	mouseX: number
	mouseY: number
}

interface RotateData {
	shapeID: string
	centerX: number
	centerY: number
	startAngle: number
	startMouseAngle: number
}

interface Options {
	canvasType: '2D' | '3D'
	pointer3DTools?: ReturnType<typeof usePointer3DTools>
}

export function useShapeCoreOld(options: Options = { canvasType: '2D' }) {
	if (options.canvasType === '3D' && !options.pointer3DTools)
		throw new Error('useShapeCore: pointer3DTools is required when canvasType is 3D')
	const is3D = options.canvasType === '3D'

	const { ydoc, provider, shapes, yShapes } = useYShapes()
	const { lockedShapeIDs } = useLockedShapes(provider)

	const hoveredShapeID = ref<string | null>(null)
	const hoveredHandle = ref<string | null>(null)
	const currentHandle = ref<string | null>(null)

	const draggingShapeID = ref<string | null>(null)
	const dragOffset = ref<PositionXY>({ x: 0, y: 0 })
	const dragData = ref<DragDataLine | null>(null)

	const resizingShapeID = ref<string | null>(null)
	const resizeData = ref<ResizeData | null>(null)

	const rotatingShapeID = ref<string | null>(null)
	const rotateData = ref<RotateData | null>(null)

	const activeShapeID = computed(() => draggingShapeID.value || resizingShapeID.value || hoveredShapeID.value)

	watch(activeShapeID, () => {
		provider.awareness.setLocalStateField('editingShapeID', activeShapeID.value || null)
	})

	function findShapeIndexByID(id: string): number {
		for (let i = 0; i < yShapes.length; i++) {
			if (yShapes.get(i).id === id) return i
		}
		return -1
	}

	const createShape: CreateShapeFn = (options: CreateShapeOptions = {}): Shape => {
		const type = options.type || ShapeType.RECT
		let shape: Shape

		switch (type) {
			case ShapeType.RECT:
				if (options.x1 === undefined || options.y1 === undefined) {
					throw new Error('createShape: missing coordinates for RECT')
				}
				shape = {
					id: crypto.randomUUID(),
					type: ShapeType.RECT,
					x1: options.x1,
					y1: options.y1,
					x2: options.x2 || options.x1 + 60,
					y2: options.y2 || options.y1 + 60,
					color: options.color || getRandomPastelColor(),
					rotation: options.rotation || 0,
				}
				break
			case ShapeType.ELLIPSE:
				if (options.x1 === undefined || options.y1 === undefined) {
					throw new Error('createShape: missing coordinates for ELLIPSE')
				}
				shape = {
					id: crypto.randomUUID(),
					type: ShapeType.ELLIPSE,
					x1: options.x1,
					y1: options.y1,
					x2: options.x2 || options.x1 + 60,
					y2: options.y2 || options.y1 + 60,
					color: options.color || getRandomPastelColor(),
					rotation: options.rotation || 0,
				}
				break
			case ShapeType.LINE:
				if (options.x1 === undefined || options.y1 === undefined || options.x2 === undefined || options.y2 === undefined) {
					throw new Error('createShape: missing coordinates for LINE')
				}
				shape = {
					id: crypto.randomUUID(),
					type: ShapeType.LINE,
					x1: options.x1,
					y1: options.y1,
					x2: options.x2,
					y2: options.y2,
					color: options.color || getRandomPastelColor(),
				}
				break

			case ShapeType.ARROW:
				if (options.x1 === undefined || options.y1 === undefined || options.x2 === undefined || options.y2 === undefined) {
					throw new Error('createShape: missing coordinates for ARROW')
				}
				if (options.arrowSize === undefined) {
					throw new Error('createShape: missing arrowSize for ARROW')
				}
				shape = {
					id: crypto.randomUUID(),
					type: ShapeType.ARROW,
					x1: options.x1,
					y1: options.y1,
					x2: options.x2,
					y2: options.y2,
					color: options.color || getRandomPastelColor(),
					arrowSize: options.arrowSize,
				}
				break
			case ShapeType.PENCIL:
				if (!options.points || options.points.length < 2) {
					throw new Error('createShape: missing or invalid points for PENCIL')
				}
				shape = {
					id: crypto.randomUUID(),
					type: ShapeType.PENCIL,
					points: options.points,
					color: options.color || getRandomPastelColor(),
					lineWidth: options.lineWidth || 5,
				}
				break
			default:
				throw new Error(`useShapeCore: Invalid shape type ${type}`)
		}

		ydoc.transact(() => {
			yShapes.push([shape])
		}, YShapeTransactions.CREATE)

		return shape
	}

	function deleteShape(id: string) {
		const idx = findShapeIndexByID(id)
		if (idx >= 0) ydoc.transact(() => yShapes.delete(idx, 1), YShapeTransactions.DELETE)
	}

	// replace with findShapeAtPos3D
	function findShapeAtPos({ x, y }: PositionXY): Shape | null {
		for (let i = shapes.value.length - 1; i >= 0; i--) {
			const shape = shapes.value[i]
			const handleName = findHandleAtPos(shape, { x, y })
			if (handleName) return shape

			if (shape.type === ShapeType.RECT || shape.type === ShapeType.ELLIPSE) {
				const isInsideBounds = x >= shape.x1 && x <= shape.x2 && y >= shape.y1 && y <= shape.y2
				if (isInsideBounds) return shape
			} else if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
				const { x1, y1, x2, y2 } = shape as LineShape | ArrowShape
				const dist = getPointToSegmentDistance(x, y, x1, y1, x2, y2)
				if (dist <= HANDLE_SIZE) return shape
			}
		}
		return null
	}

	function findHandleAtPos(shape: Shape, pos: PositionXY): HandleName | null {
		const { x, y } = is3D ? options.pointer3DTools!.worldToScreen(pos) : pos

		const clickHelper = HANDLE_SIZE / 2
		const handles = computeHandles(shape)
		for (const handle of handles) {
			const { x: handleX, y: handleY } = is3D ? options.pointer3DTools!.worldToScreen(handle) : handle
			if (x >= handleX - clickHelper && x <= handleX + clickHelper && y >= handleY - clickHelper && y <= handleY + clickHelper) {
				return handle.name
			}
		}
		return null
	}

	function getLocalCorners2D(halfW: number, halfH: number): Handle[] {
		return [
			{ x: -halfW, y: -halfH, name: 'tl' },
			{ x: halfW, y: -halfH, name: 'tr' },
			{ x: halfW, y: halfH, name: 'br' },
			{ x: -halfW, y: halfH, name: 'bl' },
		]
	}

	function getLocalCorners3D(halfW: number, halfH: number): Handle[] {
		return [
			{ x: -halfW, y: halfH, name: 'tl' },
			{ x: halfW, y: halfH, name: 'tr' },
			{ x: halfW, y: -halfH, name: 'br' },
			{ x: -halfW, y: -halfH, name: 'bl' },
		]
	}

	function computeRectHandlers(shape: RectShape | EllipseShape) {
		const centerX = (shape.x1 + shape.x2) / 2
		const centerY = (shape.y1 + shape.y2) / 2
		const halfW = (shape.x2 - shape.x1) / 2
		const halfH = (shape.y2 - shape.y1) / 2
		const angle = shape.rotation

		//  offsets from a center cuz of rotation
		const localCorners = is3D ? getLocalCorners3D(halfW, halfH) : getLocalCorners2D(halfW, halfH)

		const handles: Handle[] = localCorners.map(({ x, y, name }) => {
			const worldPos = localToWorld({ x, y }, angle)
			return { x: centerX + worldPos.x, y: centerY + worldPos.y, name }
		})

		const rotateOffset = 20
		const localX = 0
		const localY = -halfH - rotateOffset
		const worldPos = localToWorld({ x: localX, y: localY }, angle)
		handles.push({ x: centerX + worldPos.x, y: centerY + worldPos.y, name: 'rotate' })

		return handles
	}

	function computeLineHandlers(shape: LineShape | ArrowShape): Handle[] {
		return [
			{ x: shape.x1, y: shape.y1, name: 'start' },
			{ x: (shape.x1 + shape.x2) / 2, y: (shape.y1 + shape.y2) / 2, name: 'mid' },
			{ x: shape.x2, y: shape.y2, name: 'end' },
		]
	}

	function computeHandles(shape: Shape): Handle[] {
		if (shape.type === ShapeType.RECT || shape.type === ShapeType.ELLIPSE) return computeRectHandlers(shape)
		if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) return computeLineHandlers(shape)
		return []
	}

	let pendingShape: Shape | null = null
	let pendingIndex: number = -1
	let frameID: number | null = null

	function scheduleSync(shape: Shape) {
		pendingShape = shape
		if (frameID != null) return
		frameID = requestAnimationFrame(() => {
			movePendingShape()
			frameID = null
		})
	}

	// TODO: replace with maps
	function movePendingShape(transaction: YShapeTransactions.UPDATE_MOVE | YShapeTransactions.UPDATE = YShapeTransactions.UPDATE_MOVE) {
		if (pendingShape && pendingIndex >= 0) {
			ydoc.transact(() => {
				yShapes.delete(pendingIndex, 1)
				yShapes.insert(pendingIndex, [toRaw(pendingShape!)])
			}, transaction)
		}
	}

	function startRotate(worldPos: PositionXY, shape: Shape) {
		if (shape.type !== ShapeType.RECT && shape.type !== ShapeType.ELLIPSE) return

		rotatingShapeID.value = shape.id

		const centerX = (shape.x1 + shape.x2) / 2
		const centerY = (shape.y1 + shape.y2) / 2
		const dx = worldPos.x - centerX
		const dy = worldPos.y - centerY

		rotateData.value = {
			shapeID: shape.id,
			centerX,
			centerY,
			startAngle: shape.rotation,
			startMouseAngle: Math.atan2(dy, dx),
		}
	}

	function startDrag(pos: PositionXY, shape: Shape) {
		if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
			draggingShapeID.value = shape.id
			dragData.value = {
				shapeID: shape.id,
				startX1: shape.x1,
				startY1: shape.y1,
				startX2: shape.x2,
				startY2: shape.y2,
				mouseX: pos.x,
				mouseY: pos.y,
			}
		} else {
			draggingShapeID.value = shape.id
			dragOffset.value = {
				x: pos.x - shape.x,
				y: pos.y - shape.y,
			}
		}
	}

	function startResizeRect(mousePos: PositionXY, shape: RectShape | EllipseShape, handle: HandleName) {
		resizingShapeID.value = shape.id
		currentHandle.value = handle

		resizeData.value = {
			type: ResizeType.RECT,
			shapeID: shape.id,
			handle,
			startX1: shape.x1,
			startY1: shape.y1,
			startX2: shape.x2,
			startY2: shape.y2,
			mouseX: mousePos.x,
			mouseY: mousePos.y,
		}
	}

	function startResizeLine(mousePos: PositionXY, shape: LineShape | ArrowShape, handle: HandleName) {
		resizingShapeID.value = shape.id
		currentHandle.value = handle
		resizeData.value = {
			type: ResizeType.LINE,
			shapeID: shape.id,
			handle,
			startX1: shape.x1,
			startY1: shape.y1,
			startX2: shape.x2,
			startY2: shape.y2,
			mouseX: mousePos.x,
			mouseY: mousePos.y,
		}
	}

	function handleMouseDown(mousePos: PositionXY, shape: Shape) {
		if (!shape || lockedShapeIDs.value.has(shape.id)) return

		const handle = findHandleAtPos(shape, mousePos)
		if (handle === 'rotate') {
			startRotate(mousePos, shape)
		} else if (handle) {
			if (shape.type === ShapeType.RECT || shape.type === ShapeType.ELLIPSE) {
				startResizeRect(mousePos, shape, handle)
			} else if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
				startResizeLine(mousePos, shape, handle)
			}
		} else {
			startDrag(mousePos, shape)
		}

		pendingIndex = findShapeIndexByID(shape.id)
	}

	function handleMouseHover(worldPos: PositionXY) {
		const shape = findShapeAtPos(worldPos)
		hoveredShapeID.value = shape?.id || null
		if (shape) hoveredHandle.value = findHandleAtPos(shape, worldPos)
		else hoveredHandle.value = null
	}

	function handleMouseDrag(pos: PositionXY) {
		if (!draggingShapeID.value) return

		const shape = shapes.value.find((s) => s.id === draggingShapeID.value)!
		if (shape.type === ShapeType.RECT || shape.type === ShapeType.ELLIPSE) {
			const dx = pos.x - dragOffset.value.x
			const dy = pos.y - dragOffset.value.y
			const width = shape.x2 - shape.x1
			const height = shape.y2 - shape.y1
			shape.x1 = dx
			shape.y1 = dy
			shape.x2 = dx + width
			shape.y2 = dy + height
		} else if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
			const data = dragData.value!
			const dx = pos.x - data.mouseX
			const dy = pos.y - data.mouseY
			shape.x1 = data.startX1 + dx
			shape.y1 = data.startY1 + dy
			shape.x2 = data.startX2 + dx
			shape.y2 = data.startY2 + dy
		}

		scheduleSync(shape)
	}

	function handleMouseResize(mousePos: PositionXY) {
		const data = resizeData.value
		if (!data) return
		if (data.type === ResizeType.RECT) handleResizeRect(data, mousePos)
		else if (data.type === ResizeType.LINE) handleResizeLine(data, mousePos)
	}

	function handleResizeRect(data: ResizeDataRect, mousePos: PositionXY) {
		const shape = shapes.value.find((s) => s.id === data.shapeID)! as RectShape | EllipseShape

		const dx = mousePos.x - data.mouseX
		const dy = mousePos.y - data.mouseY
		const corners = calculateNewCorners(data, { x: dx, y: dy })

		const { x, y, width, height } = applyMinSize(corners, data)

		shape.x1 = x
		shape.y1 = y
		shape.x2 = x + width
		shape.y2 = y + height

		scheduleSync(shape)
	}

	interface Corners {
		left: number
		right: number
		top: number
		bottom: number
	}

	function calculateNewCorners(data: ResizeDataRect, localPos: PositionXY): Corners {
		let left = data.startX1
		let right = data.startX2
		let top = data.startY1
		let bottom = data.startY2

		if (data.handle.includes('l')) left += localPos.x
		if (data.handle.includes('r')) right += localPos.x
		if (data.handle.includes('t')) top += localPos.y
		if (data.handle.includes('b')) bottom += localPos.y

		if (left > right) [left, right] = [right, left]
		if (is3D) {
			if (bottom > top) [top, bottom] = [bottom, top]
		} else {
			if (top > bottom) [top, bottom] = [bottom, top]
		}

		return { left, right, top, bottom }
	}

	function applyMinSize(
		corners: Corners,
		data: ResizeDataRect,
	): {
		x: number
		y: number
		width: number
		height: number
	} {
		let { left, right, top, bottom } = corners

		let width = right - left
		let height = is3D ? top - bottom : bottom - top

		if (width < MIN_SHAPE_SIZE) {
			if (data.handle.includes('l') && !data.handle.includes('r')) {
				left = right - MIN_SHAPE_SIZE
				width = MIN_SHAPE_SIZE
			} else {
				right = left + MIN_SHAPE_SIZE
				width = MIN_SHAPE_SIZE
			}
		}
		if (height < MIN_SHAPE_SIZE) {
			if (data.handle.includes('t') && !data.handle.includes('b')) {
				if (is3D) {
					top = bottom + MIN_SHAPE_SIZE
				} else {
					bottom = top + MIN_SHAPE_SIZE
				}
				height = MIN_SHAPE_SIZE
			} else {
				if (is3D) {
					bottom = top - MIN_SHAPE_SIZE
				} else {
					top = bottom - MIN_SHAPE_SIZE
				}
				height = MIN_SHAPE_SIZE
			}
		}

		const x = left
		const y = is3D ? bottom : top

		return { x, y, width, height }
	}

	function handleResizeLine(data: ResizeDataLine, mousePos: PositionXY) {
		const shape = shapes.value.find((s) => s.id === data.shapeID)! as LineShape | ArrowShape
		const dx = mousePos.x - data.mouseX
		const dy = mousePos.y - data.mouseY

		if (data.handle === 'start') {
			shape.x1 = data.startX1 + dx
			shape.y1 = data.startY1 + dy
		} else if (data.handle === 'end') {
			shape.x2 = data.startX2 + dx
			shape.y2 = data.startY2 + dy
		} else if (data.handle === 'mid') {
			const mx = dx
			const my = dy
			shape.x1 = data.startX1 + mx
			shape.y1 = data.startY1 + my
			shape.x2 = data.startX2 + mx
			shape.y2 = data.startY2 + my
		}

		scheduleSync(shape)
	}

	function handleMouseRotate(worldPos: PositionXY) {
		if (!rotatingShapeID.value || !rotateData.value) return

		const shape = shapes.value.find((s) => s.id === rotatingShapeID.value)
		if (!shape) return

		const dx = worldPos.x - rotateData.value.centerX
		const dy = worldPos.y - rotateData.value.centerY
		const currentAngle = Math.atan2(dy, dx)
		const deltaAngle = currentAngle - rotateData.value.startMouseAngle

		shape.rotation = rotateData.value.startAngle + deltaAngle
		scheduleSync(shape)
	}

	function handleMouseMove(worldPos: PositionXY) {
		if (draggingShapeID.value) handleMouseDrag(worldPos)
		else if (resizingShapeID.value) handleMouseResize(worldPos)
		else if (rotatingShapeID.value) handleMouseRotate(worldPos)
		else handleMouseHover(worldPos)
	}

	function handleMouseUp() {
		if (pendingShape) {
			movePendingShape(YShapeTransactions.UPDATE)
			void saveShapeDB(pendingShape)
		}

		draggingShapeID.value = null
		dragOffset.value = { x: 0, y: 0 }
		dragData.value = null

		resizingShapeID.value = null
		resizeData.value = null

		rotatingShapeID.value = null
		rotateData.value = null

		pendingShape = null
		pendingIndex = -1
	}

	function handleMouseLeave() {
		hoveredShapeID.value = null
		hoveredHandle.value = null
	}

	function getCursor() {
		if (hoveredHandle.value) {
			switch (hoveredHandle.value) {
				case 'rotate':
					return 'crosshair'
				case 'start':
				case 'mid':
				case 'end':
					return 'move'
				case 'tl':
				case 'br':
					return 'nwse-resize'
				case 'tr':
				case 'bl':
					return 'nesw-resize'
				default:
					return 'default'
			}
		}
		return 'default'
	}

	const unloadHandler = async () => {
		if (activeShapeID.value) {
			const shape = shapes.value.find((s) => s.id === activeShapeID.value)
			if (shape) await saveShapeDB(shape)
		}
	}
	onMounted(() => window.addEventListener('beforeunload', unloadHandler))
	onBeforeUnmount(() => {
		if (frameID) cancelAnimationFrame(frameID)
		window.removeEventListener('beforeunload', unloadHandler)
	})

	return {
		HANDLE_SIZE,
		shapes,
		draggingShapeID,
		resizingShapeID,
		hoveredShapeID,
		rotatingShapeID,
		activeShapeID,
		hoveredHandle,
		computeHandles,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		handleMouseLeave,
		getCursor,
		findShapeAtPos,
		findHandleAtPos,
		createShape,
		deleteShape,
		lockedShapeIDs,
		scheduleSync,
	}
}
