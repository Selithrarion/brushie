import { ref, toRaw, watch } from 'vue'
import type * as Y from 'yjs'

import type { Shape } from '@/features/render/types/Shape.ts'
import { YShapeTransactions } from '@/features/sync/types/transactions.ts'
import { useLockedShapes } from '@/features/sync/useLockedShapes.ts'
import { useYShapes } from '@/features/sync/useYShapes.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'
import { getRandomPastelColor } from '@/shared/utils/colors.ts'

import { saveShapeDB } from './db.ts'

const HANDLE_SIZE = 8

function computeHandles(shape: Shape) {
	const { x, y, width: w, height: h } = shape
	return [
		{ x: x, y: y },
		{ x: x + w / 2, y: y },
		{ x: x + w, y: y },
		{ x: x + w, y: y + h / 2 },
		{ x: x + w, y: y + h },
		{ x: x + w / 2, y: y + h },
		{ x: x, y: y + h },
		{ x: x, y: y + h / 2 },
	]
}

function getHandleNameAtPos(shape: Shape, mx: number, my: number) {
	const half = HANDLE_SIZE / 2
	const handles = computeHandles(shape)
	const names = ['tl', 'tc', 'tr', 'rc', 'br', 'bc', 'bl', 'lc']
	for (let i = 0; i < handles.length; i++) {
		const { x, y } = handles[i]
		if (mx >= x - half && mx <= x + half && my >= y - half && my <= y + half) {
			return names[i]
		}
	}
	return null
}

function findShapeIndexById(yShapes: Y.Array<Shape>, id: string): number {
	for (let i = 0; i < yShapes.length; i++) {
		const s = yShapes.get(i)
		if (s.id === id) return i
	}
	return -1
}

type ShapeType = 'rect' | 'ellipse' | 'line'

interface CreateShapeOptions {
	type?: ShapeType
	width?: number
	height?: number
	color?: string
	// rotation?: number
	// strokeWidth?: number
	// fillPattern?: string
	// metadata?: Record<string, any>
}

export function useShapeInteractions() {
	const { ydoc, provider, shapes, yShapes } = useYShapes()
	const { lockedShapeIDs } = useLockedShapes(provider)

	const hoveredShapeID = ref<string | null>(null)
	const draggingShapeID = ref<string | null>(null)
	const resizingShapeID = ref<string | null>(null)

	const hoveredHandle = ref<string | null>(null)
	const currentHandle = ref<string | null>(null)

	const dragOffset = ref({ x: 0, y: 0 })
	const resizeData = ref<{
		shapeId: string
		handle: string
		startX: number
		startY: number
		startW: number
		startH: number
		mouseX: number
		mouseY: number
	} | null>(null)

	watch([draggingShapeID, resizingShapeID], ([dragId, resizeId]) => {
		provider.awareness.setLocalStateField('editingShapeID', dragId || resizeId || null)
	})

	function createShape(pos: PositionXY, options: CreateShapeOptions = {}) {
		const type = options.type || 'rect'
		let shape: Shape

		switch (type) {
			case 'rect':
				shape = {
					id: crypto.randomUUID(),
					// type: 'rect',
					x: pos.x - (options.width || 60) / 2,
					y: pos.y - (options.height || 40) / 2,
					width: options.width || 60,
					height: options.height || 40,
					color: options.color || getRandomPastelColor(),
					// rotation: options.rotation || 0,
				}
				break
			// case 'ellipse':
			// 	shape = {
			// 		id: crypto.randomUUID(),
			// 		// type: 'ellipse',
			// 		x: pos.x,
			// 		y: pos.y,
			// 		// rx: (options.width || 60) / 2,
			// 		// ry: (options.height || 40) / 2,
			// 		color: options.color || getRandomPastelColor(),
			// 		// strokeWidth: options.strokeWidth || 2,
			// 	}
			// 	break
			// case 'line':
			// 	shape = {
			// 		id: crypto.randomUUID(),
			// 		// type: 'line',
			// 		// x1: pos.x,
			// 		// y1: pos.y,
			// 		// x2: pos.x + (options.width || 60),
			// 		// y2: pos.y + (options.height || 0),
			// 		color: options.color || getRandomPastelColor(),
			// 		// lineCap: 'round',
			// 	}
			// 	break
			default:
				console.log('invalid shape type')
				return
		}

		ydoc.transact(() => {
			yShapes.push([shape])
		}, YShapeTransactions.CREATE)
		return shape
	}

	function deleteShape(id: string) {
		const yIdx = findShapeIndexById(yShapes, id)
		if (yIdx >= 0) {
			ydoc.transact(() => yShapes.delete(yIdx, 1), YShapeTransactions.DELETE)
		}
	}

	function findShapeAtPos({ x, y }: PositionXY): Shape | null {
		for (let i = shapes.value.length - 1; i >= 0; i--) {
			const s = shapes.value[i]
			if (getHandleNameAtPos(s, x, y)) return s
			if (x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height) return s
		}
		return null
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
	function movePendingShape(transaction: YShapeTransactions.UPDATE_MOVE | YShapeTransactions.UPDATE = YShapeTransactions.UPDATE_MOVE) {
		if (pendingShape && pendingIndex >= 0) {
			ydoc.transact(() => {
				yShapes.delete(pendingIndex, 1)
				yShapes.insert(pendingIndex, [toRaw(pendingShape!)])
			}, transaction)
		}
	}

	function handleMouseDown(pos: PositionXY) {
		const shape = findShapeAtPos(pos)
		if (shape && lockedShapeIDs.value.includes(shape.id)) return

		if (shape) {
			const handle = getHandleNameAtPos(shape, pos.x, pos.y)
			if (handle) {
				resizingShapeID.value = shape.id
				currentHandle.value = handle
				resizeData.value = {
					shapeId: shape.id,
					handle,
					startX: shape.x,
					startY: shape.y,
					startW: shape.width,
					startH: shape.height,
					mouseX: pos.x,
					mouseY: pos.y,
				}
			} else {
				draggingShapeID.value = shape.id
				dragOffset.value = { x: pos.x - shape.x, y: pos.y - shape.y }
			}

			pendingIndex = findShapeIndexById(yShapes, shape.id)
		} else {
			createShape({ x: pos.x, y: pos.y })
		}
	}

	function handleMouseHover(pos: PositionXY) {
		let foundShape: Shape | null = null
		let foundHandle: string | null = null
		for (let i = shapes.value.length - 1; i >= 0; i--) {
			const s = shapes.value[i]
			const handle = getHandleNameAtPos(s, pos.x, pos.y)
			if (handle) {
				foundShape = s
				foundHandle = handle
				break
			} else if (pos.x >= s.x && pos.x <= s.x + s.width && pos.y >= s.y && pos.y <= s.y + s.height) {
				foundShape = s
				break
			}
		}
		hoveredShapeID.value = foundShape?.id || null
		hoveredHandle.value = foundHandle
	}
	function handleMouseDrag(pos: PositionXY) {
		const shape = shapes.value.find((s) => s.id === draggingShapeID.value)!
		shape.x = pos.x - dragOffset.value.x
		shape.y = pos.y - dragOffset.value.y
		scheduleSync(shape)
	}

	function handleMouseResize(pos: PositionXY) {
		const data = resizeData.value!
		const shape = shapes.value.find((s) => s.id === data.shapeId)!
		const dx = pos.x - data.mouseX
		const dy = pos.y - data.mouseY
		let newX = data.startX
		let newY = data.startY
		let newW = data.startW
		let newH = data.startH
		switch (data.handle) {
			case 'tl':
				newX = data.startX + dx
				newY = data.startY + dy
				newW = data.startW - dx
				newH = data.startH - dy
				break
			case 'tc':
				newY = data.startY + dy
				newH = data.startH - dy
				break
			case 'tr':
				newY = data.startY + dy
				newW = data.startW + dx
				newH = data.startH - dy
				break
			case 'rc':
				newW = data.startW + dx
				break
			case 'br':
				newW = data.startW + dx
				newH = data.startH + dy
				break
			case 'bc':
				newH = data.startH + dy
				break
			case 'bl':
				newX = data.startX + dx
				newW = data.startW - dx
				newH = data.startH + dy
				break
			case 'lc':
				newX = data.startX + dx
				newW = data.startW - dx
				break
		}
		const MIN_SIZE = 10
		if (newW < MIN_SIZE) {
			if (data.handle.includes('l')) {
				newX = data.startX + (data.startW - MIN_SIZE)
			}
			newW = MIN_SIZE
		}
		if (newH < MIN_SIZE) {
			if (data.handle.includes('t')) {
				newY = data.startY + (data.startH - MIN_SIZE)
			}
			newH = MIN_SIZE
		}
		shape.x = newX
		shape.y = newY
		shape.width = newW
		shape.height = newH
		scheduleSync(shape)
	}

	function handleMouseMove(pos: PositionXY) {
		if (!draggingShapeID.value && !resizingShapeID.value) {
			handleMouseHover(pos)
			return
		}
		if (draggingShapeID.value) handleMouseDrag(pos)
		if (resizingShapeID.value && resizeData.value) handleMouseResize(pos)
	}

	function handleMouseUp() {
		if (pendingShape) {
			movePendingShape(YShapeTransactions.UPDATE)
			void saveShapeDB(pendingShape)
		}
		draggingShapeID.value = null
		resizingShapeID.value = null
		pendingShape = null
		pendingIndex = -1
	}

	function handleMouseLeave() {
		hoveredShapeID.value = null
		hoveredHandle.value = null
	}

	function getCursor() {
		if (hoveredHandle.value) {
			const map: Record<string, string> = {
				tl: 'nwse-resize',
				br: 'nwse-resize',
				tr: 'nesw-resize',
				bl: 'nesw-resize',
				tc: 'ns-resize',
				bc: 'ns-resize',
				lc: 'ew-resize',
				rc: 'ew-resize',
			}
			return map[hoveredHandle.value] || 'default'
		} else if (hoveredShapeID.value) {
			return 'grab'
		}
		return 'default'
	}

	window.addEventListener('beforeunload', async () => {
		const id = draggingShapeID.value || resizingShapeID.value
		if (id) {
			const shape = shapes.value.find((s) => s.id === id)
			if (shape) await saveShapeDB(shape)
		}
	})

	return {
		HANDLE_SIZE,
		shapes,
		draggingShapeID,
		resizingShapeID,
		hoveredShapeID,
		hoveredHandle,
		computeHandles,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		handleMouseLeave,
		getCursor,
		findShapeAtPos,
		createShape,
		deleteShape,
		lockedShapeIDs,
	}
}
