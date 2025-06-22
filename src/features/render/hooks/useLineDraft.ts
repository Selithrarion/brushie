import { type Ref, ref } from 'vue'

import type { CreateShapeFn } from '@/features/render/hooks/useShapeCore.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'
import { getRandomPastelColor } from '@/shared/utils/colors.ts'

import { type ArrowShape, type LineShape, ShapeType } from '../types/Shape'

export const ARROW_SIZE = 6

export function useLineDraft(createShape: CreateShapeFn) {
	const shape: Ref<LineShape | ArrowShape | null> = ref(null)

	function start(startPos: PositionXY, type: ShapeType.LINE | ShapeType.ARROW) {
		shape.value = {
			id: 'draft-' + crypto.randomUUID(),
			type,
			x1: startPos.x,
			y1: startPos.y,
			x2: startPos.x,
			y2: startPos.y,
			color: getRandomPastelColor(),
			...(type === ShapeType.ARROW ? { arrowSize: ARROW_SIZE } : {}),
		} as LineShape | ArrowShape
		// yShapes.push([shape])
	}

	function update(pos: PositionXY) {
		if (!shape.value) return
		shape.value.x2 = pos.x
		shape.value.y2 = pos.y
	}

	function clear() {
		// const index = yShapes.toArray().findIndex((s) => s.id === lineShapeDraft!.id)
		// if (index !== -1) yShapes.delete(index)
		shape.value = null
	}

	function commit() {
		if (!shape.value) return
		createShape(shape.value)
		clear()
	}

	return {
		shape,
		start,
		update,
		clear,
		commit,
	}
}
