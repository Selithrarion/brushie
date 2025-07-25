import { ref } from 'vue'
import type { Ref } from 'vue'

import type { Box } from '@/features/editor/types/box.types.ts'
import type { Shape } from '@/features/editor/types/shape.types.ts'
import { computeBoundingBoxForShape, isBoxIntersect } from '@/features/editor/utils/box.utils.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'

export function useShapeSelection(shapes: Ref<Shape[]>, lockedShapeIDs: Ref<Set<string>>) {
	const selectedShapeIDs = ref<string[]>([])

	const dragStart = ref<PositionXY | null>(null)
	const dragCurrent = ref<PositionXY | null>(null)
	const isDragging = ref(false)

	function select(id: string, isAdditive = false) {
		if (isAdditive) {
			if (!selectedShapeIDs.value.includes(id)) {
				selectedShapeIDs.value.push(id)
			}
		} else if (!selectedShapeIDs.value.includes(id)) {
			selectedShapeIDs.value = [id]
		}
	}

	function deselect(id: string) {
		selectedShapeIDs.value = selectedShapeIDs.value.filter((v) => v !== id)
	}

	function toggle(id: string) {
		if (selectedShapeIDs.value.includes(id)) {
			deselect(id)
		} else {
			selectedShapeIDs.value.push(id)
		}
	}

	function clear() {
		selectedShapeIDs.value = []
	}

	function isSelected(id: string) {
		return selectedShapeIDs.value.includes(id)
	}

	function selectByArea(rect: Box) {
		const selected = shapes.value.filter((s) => {
			if (lockedShapeIDs.value.has(s.id)) return false
			const box = computeBoundingBoxForShape(s)
			return box ? isBoxIntersect(box, rect) : false
		})
		selectedShapeIDs.value = selected.map((s) => s.id)
	}

	function handleClick(id: string, $event: MouseEvent) {
		const shift = $event.shiftKey
		if (shift) {
			toggle(id)
		} else {
			select(id, false)
		}
	}

	function handleMouseDown(worldPos: PositionXY) {
		dragStart.value = worldPos
		dragCurrent.value = worldPos
		isDragging.value = true
	}

	function handleMouseMove(worldPos: PositionXY) {
		if (!isDragging.value) return
		dragCurrent.value = worldPos
	}

	function handleMouseUp() {
		if (isDragging.value && dragStart.value && dragCurrent.value) {
			selectByArea({
				x1: dragStart.value.x,
				y1: dragStart.value.y,
				x2: dragCurrent.value.x,
				y2: dragCurrent.value.y,
			})
		}
		isDragging.value = false
		dragStart.value = null
		dragCurrent.value = null
	}

	function reset() {
		selectedShapeIDs.value = []
		isDragging.value = false
		dragStart.value = null
		dragCurrent.value = null
	}

	return {
		selectedShapeIDs,
		select,
		deselect,
		toggle,
		clear,
		isSelected,
		selectByArea,
		handleClick,

		dragStart,
		dragCurrent,
		isDragging,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		reset,
	}
}
