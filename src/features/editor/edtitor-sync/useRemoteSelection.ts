import { ref, watch } from 'vue'
import type { Awareness } from 'y-protocols/awareness'

import type { useBoundingBox } from '@/features/editor/editor-shapes/hooks/useBoundingBox.ts'
import type { useShapeSelection } from '@/features/editor/editor-shapes/hooks/useShapeSelection.ts'
import {
	AWARENESS_BOX_KEY,
	AWARENESS_LOCKED_SHAPES_KEY,
	AWARENESS_SELECTION_KEY,
} from '@/features/editor/edtitor-sync/constants/awareness.consts.ts'
import type { BoundingBox } from '@/features/editor/types/box.types.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'

export function useRemoteSelection(
	provider: { awareness: Awareness },
	selection: ReturnType<typeof useShapeSelection>,
	boundingBox: ReturnType<typeof useBoundingBox>,
) {
	const remoteBoxes = ref<Record<string, BoundingBox>>({})
	const remoteSelectionBoxes = ref<Record<string, { start: PositionXY; current: PositionXY }>>({})

	watch(
		boundingBox.visualBox,
		(box) => {
			provider.awareness.setLocalStateField(AWARENESS_BOX_KEY, box)
		},
		{ deep: true },
	)

	watch(
		() => [selection.dragStart.value, selection.dragCurrent.value],
		([start, current]) => {
			if (start && current) {
				provider.awareness.setLocalStateField(AWARENESS_SELECTION_KEY, { start, current })
			} else {
				provider.awareness.setLocalStateField(AWARENESS_SELECTION_KEY, null)
			}
		},
		{ deep: true },
	)

	watch(
		() => [...selection.selectedShapeIDs.value],
		(ids) => {
			provider.awareness.setLocalStateField(AWARENESS_LOCKED_SHAPES_KEY, ids.length ? ids : null)
		},
	)

	provider.awareness.on('change', () => {
		const states = provider.awareness.getStates()

		const boxes: Record<string, BoundingBox> = {}
		const selBoxes: Record<string, { start: PositionXY; current: PositionXY }> = {}

		states.forEach((state, clientID) => {
			if (clientID !== provider.awareness.clientID) {
				if (state[AWARENESS_BOX_KEY]) boxes[clientID] = state[AWARENESS_BOX_KEY]
				if (state[AWARENESS_SELECTION_KEY]) selBoxes[clientID] = state[AWARENESS_SELECTION_KEY]
			}
		})

		remoteBoxes.value = boxes
		remoteSelectionBoxes.value = selBoxes
	})

	return {
		remoteBoxes,
		remoteSelectionBoxes,
	}
}
