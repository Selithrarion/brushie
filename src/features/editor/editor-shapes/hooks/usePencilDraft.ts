import type { CreateShapeFn } from '@/features/editor/editor-shapes/hooks/useShapeCore.ts'
import { downsamplePoints, smoothCurve } from '@/features/editor/utils/point.utils.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'
import { getRandomPastelColor } from '@/shared/utils/colors.ts'

import { type PencilShape, ShapeType } from '../../types/shape.types.ts'

import { useShapeDraft } from './useShapeDraft.ts'

export type PencilStartArgs = [PositionXY]

export function usePencilDraft(createShape: CreateShapeFn) {
	return useShapeDraft<PencilShape, PencilStartArgs>({
		createShape,

		createInitialDraft(pos) {
			return {
				id: 'draft-' + crypto.randomUUID(),
				type: ShapeType.PENCIL,
				points: [pos],
				color: getRandomPastelColor(),
				lineWidth: 5,
			}
		},

		updateDraft(draft, pos) {
			if (!draft.value) return
			const pts = draft.value.points
			const lastPos = pts[pts.length - 1]
			const isTooClose = lastPos && Math.hypot(pos.x - lastPos.x, pos.y - lastPos.y) < 2
			if (isTooClose) return

			pts.push(pos)

			const N = 12
			const rawTail = pts.slice(-N)
			const smoothed = smoothCurve(downsamplePoints(rawTail, 2), 1)
			const head = pts.slice(0, -rawTail.length)

			draft.value.points = [...head, ...smoothed]
		},

		validateDraft(draft) {
			return draft.points.length >= 3 * 3
		},
	})
}
