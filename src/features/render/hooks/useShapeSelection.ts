import { ref } from 'vue'
import type { Ref } from 'vue'

import type { Shape } from '@/features/render/types/Shape'
import { computeBoundingBoxForShape } from '@/features/render/utils/boundingBox.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'

export function useShapeSelection(shapes: Ref<Shape[]>) {
	const selectedShapeIDs = ref<string[]>([])

	const dragStart = ref<PositionXY | null>(null)
	const dragCurrent = ref<PositionXY | null>(null)
	const isDragging = ref(false)

	function select(id: string, isAdditive = false) {
		if (isAdditive) {
			if (!selectedShapeIDs.value.includes(id)) {
				selectedShapeIDs.value.push(id)
			}
		} else {
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

	function selectByArea(rect: { x1: number; y1: number; x2: number; y2: number }) {
		const xMin = Math.min(rect.x1, rect.x2)
		const xMax = Math.max(rect.x1, rect.x2)
		const yMin = Math.min(rect.y1, rect.y2)
		const yMax = Math.max(rect.y1, rect.y2)
		const selected = shapes.value.filter((s) => {
			const box = computeBoundingBoxForShape(s)
			if (!box) return false
			return !(box.x2 < xMin || box.x1 > xMax || box.y2 < yMin || box.y1 > yMax)
		})
		selectedShapeIDs.value = selected.map((s) => s.id)
	}

	function handleClick(id: string, $event: MouseEvent) {
		const shift = $event.shiftKey
		const ctrl = $event.ctrlKey || $event.metaKey

		if (shift) {
			select(id, true)
		} else if (ctrl) {
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
	}
}
