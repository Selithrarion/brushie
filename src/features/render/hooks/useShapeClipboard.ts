import { ref, type Ref } from 'vue'

import type { CreateShapeFn } from '@/features/render/hooks/useShapeCore.ts'
import { type Shape, ShapeType } from '@/features/render/types/Shape'
import { computeBoundingBoxForShape, mergeBoundingBoxes } from '@/features/render/utils/boundingBox.ts'
import type { PositionXY } from '@/shared/types/PositionXY'

export function useShapeClipboard(shapes: Ref<Shape[]>, createShape: CreateShapeFn) {
	const clipboard = ref<Shape[]>([])

	function copy(ids: string[]) {
		const selected = shapes.value.filter((s) => ids.includes(s.id))
		clipboard.value = JSON.parse(JSON.stringify(selected))
	}

	function clear() {
		clipboard.value = []
	}

	function paste(pos: PositionXY) {
		if (!clipboard.value.length) return []

		const boxes = clipboard.value.map(computeBoundingBoxForShape)
		const box = mergeBoundingBoxes(boxes)
		if (!box) return []

		const centerX = (box.x1 + box.x2) / 2
		const centerY = (box.y1 + box.y2) / 2
		const dx = pos.x - centerX
		const dy = pos.y - centerY

		const newShapes = clipboard.value.map((s) => {
			if (s.type === ShapeType.PENCIL) {
				const shiftedPoints = s.points.map((point) => ({
					x: point.x + dx,
					y: point.y + dy,
				}))
				return createShape({ ...s, points: shiftedPoints })
			} else {
				return createShape({ ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy })
			}
		})

		return newShapes.map((s) => s.id)
	}

	return {
		clipboard,
		copy,
		paste,
		clear,
	}
}
