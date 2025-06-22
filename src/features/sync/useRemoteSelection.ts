import { ref, watch } from 'vue'
import type { Awareness } from 'y-protocols/awareness'

import type { useBoundingBox } from '@/features/render/hooks/useBoundingBox.ts'
import type { useShapeSelection } from '@/features/render/hooks/useShapeSelection.ts'
import type { BoundingBox } from '@/features/render/types/BoundingBox.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'

export function useRemoteSelection(
	provider: { awareness: Awareness },
	selection: ReturnType<typeof useShapeSelection>,
	boundingBox: ReturnType<typeof useBoundingBox>,
) {
	const AWARENESS_BOX_KEY = 'editingBoundingBox'
	const AWARENESS_SELECTION_KEY = 'selectionBox'
	const AWARENESS_LOCKED_SHAPES_KEY = 'editingShapeIDs'

	const remoteBoxes = ref<Record<string, BoundingBox>>({})
	const remoteSelectionBoxes = ref<Record<string, { start: PositionXY; current: PositionXY }>>({})
	const lockedShapeIDs = ref<Set<string>>(new Set())

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
		const lockedIDsSet = new Set<string>()

		states.forEach((state, clientID) => {
			if (clientID !== provider.awareness.clientID) {
				if (state[AWARENESS_BOX_KEY]) boxes[clientID] = state[AWARENESS_BOX_KEY]
				if (state[AWARENESS_SELECTION_KEY]) selBoxes[clientID] = state[AWARENESS_SELECTION_KEY]
				if (state[AWARENESS_LOCKED_SHAPES_KEY]) {
					for (const id of state[AWARENESS_LOCKED_SHAPES_KEY]) {
						lockedIDsSet.add(id)
					}
				}
			}
		})

		remoteBoxes.value = boxes
		remoteSelectionBoxes.value = selBoxes
		lockedShapeIDs.value = lockedIDsSet
	})

	return {
		remoteBoxes,
		remoteSelectionBoxes,
		lockedShapeIDs,
	}
}
