import type { CreateShapeFn } from '@/features/editor/editor-shapes/hooks/useShapeCore.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'
import { getRandomPastelColor } from '@/shared/utils/colors.ts'

import { type StrokeShape, ShapeType } from '../../types/shape.types.ts'

import { useShapeDraft } from './useShapeDraft.ts'

export type LineStartArgs = [PositionXY, ShapeType.LINE | ShapeType.ARROW]

export function useLineDraft(createShape: CreateShapeFn) {
	return useShapeDraft<StrokeShape, LineStartArgs>({
		createShape,

		createInitialDraft(pos: PositionXY, type: ShapeType.LINE | ShapeType.ARROW) {
			return {
				id: 'draft-' + crypto.randomUUID(),
				type,
				x1: pos.x,
				y1: pos.y,
				x2: pos.x,
				y2: pos.y,
				color: getRandomPastelColor(),
			}
		},

		updateDraft(draft, pos: PositionXY) {
			if (!draft.value) return
			draft.value.x2 = pos.x
			draft.value.y2 = pos.y
		},
	})
}
