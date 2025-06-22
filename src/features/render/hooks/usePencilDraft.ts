import { type Ref, ref } from 'vue'

import type { CreateShapeFn } from '@/features/render/hooks/useShapeCore.ts'
import { downsamplePoints, smoothCurve } from '@/features/render/utils/points.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'
import { getRandomPastelColor } from '@/shared/utils/colors.ts'

import { type PencilShape, ShapeType } from '../types/Shape'

export function usePencilDraft(createShape: CreateShapeFn) {
	const shape: Ref<PencilShape | null> = ref(null)
	const previewPoints = ref<PositionXY[]>([])

	function start(pos: PositionXY) {
		shape.value = {
			id: 'draft-' + crypto.randomUUID(),
			type: ShapeType.PENCIL,
			points: [pos],
			color: getRandomPastelColor(),
			lineWidth: 5,
		}
		previewPoints.value = [pos]
	}

	function update(pos: PositionXY) {
		if (!shape.value) return
		const pts = shape.value.points

		const lastPos = pts[pts.length - 1]
		const isTooClose = lastPos && Math.hypot(pos.x - lastPos.x, pos.y - lastPos.y) < 2
		if (isTooClose) return

		pts.push(pos)

		const N = 12
		const rawTail = pts.slice(-N)
		const smoothed = smoothCurve(downsamplePoints(rawTail, 2), 1)

		const head = pts.slice(0, -rawTail.length)
		shape.value.points = [...head, ...smoothed]
	}

	function clear() {
		shape.value = null
	}

	function commit() {
		if (!shape.value) {
			clear()
			return
		}

		if (shape.value.points.length < 3 * 10) {
			clear()
			return
		}

		createShape({ ...shape.value, points: shape.value.points })
		clear()
	}

	return {
		shape,
		previewPoints,
		start,
		update,
		clear,
		commit,
	}
}
