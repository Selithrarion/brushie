import { ref, toRaw, watch } from 'vue'
import type * as Y from 'yjs'

import { saveShape } from './db.ts'

import type { Shape } from '@/features/render/Shape.ts'
import { useYShapes } from '@/features/sync/useYShapes.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'
import { getRandomPastelColor } from '@/shared/utils/colors.ts'

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

function findShapeAtPos(shapes: Shape[], x: number, y: number) {
	for (let i = shapes.length - 1; i >= 0; i--) {
		const s = shapes[i]
		const handle = getHandleNameAtPos(s, x, y)
		if (handle) return s
		if (x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height) return s
	}
	return null
}

function syncShape(ydoc: Y.Doc, yShapes: Y.Array<Shape>, shape: Shape) {
	const yIndex = yShapes.toArray().findIndex((s) => s.id === shape.id)
	if (yIndex === -1) return
	ydoc.transact(() => {
		yShapes.delete(yIndex, 1)
		yShapes.insert(yIndex, [toRaw(shape)])
	})
}

export function useShapeInteractions() {
	const { ydoc, provider, shapes, yShapes } = useYShapes()

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

	async function handleMouseDown(pos: PositionXY) {
		const shape = findShapeAtPos(shapes.value, pos.x, pos.y)

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
		} else {
			const newShape: Shape = {
				id: crypto.randomUUID(),
				x: pos.x - 30,
				y: pos.y - 20,
				width: 60,
				height: 40,
				color: getRandomPastelColor(),
			}
			shapes.value.push(newShape)
			yShapes.push([newShape])
			await saveShape(newShape)
		}
	}

	function handleMouseMove(pos: PositionXY) {
		if (!draggingShapeID.value && !resizingShapeID.value) {
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
			hoveredShapeID.value = foundShape?.id ?? null
			hoveredHandle.value = foundHandle
		}
		if (draggingShapeID.value) {
			const shape = shapes.value.find((s) => s.id === draggingShapeID.value)!
			shape.x = pos.x - dragOffset.value.x
			shape.y = pos.y - dragOffset.value.y
			syncShape(ydoc, yShapes, shape)
			return
		}
		if (resizingShapeID.value && resizeData.value) {
			const data = resizeData.value
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
			syncShape(ydoc, yShapes, shape)
		}
	}

	async function handleMouseUp() {
		if (draggingShapeID.value) {
			const shape = shapes.value.find((s) => s.id === draggingShapeID.value)!
			await saveShape(shape)
			draggingShapeID.value = null
		}
		if (resizingShapeID.value) {
			const shape = shapes.value.find((s) => s.id === resizingShapeID.value)!
			await saveShape(shape)
			resizingShapeID.value = null
			currentHandle.value = null
			resizeData.value = null
		}
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
		} else {
			return 'default'
		}
	}

	window.addEventListener('beforeunload', async () => {
		if (draggingShapeID.value || resizingShapeID.value) {
			const shape = shapes.value.find((s) => s.id === draggingShapeID.value || s.id === resizingShapeID.value)
			if (shape) await saveShape(shape)
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
	}
}
