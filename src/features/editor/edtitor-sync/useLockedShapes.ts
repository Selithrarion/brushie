import { ref } from 'vue'
import type { Awareness } from 'y-protocols/awareness'

import { AWARENESS_LOCKED_SHAPES_KEY } from '@/features/editor/edtitor-sync/constants/awareness.consts.ts'

export function useLockedShapes(provider: { awareness: Awareness }) {
	const lockedShapeIDs = ref<Set<string>>(new Set())

	provider.awareness.on('change', () => {
		const states = provider.awareness.getStates()

		const lockedIDsSet = new Set<string>()

		states.forEach((state, clientID) => {
			if (clientID !== provider.awareness.clientID) {
				if (state[AWARENESS_LOCKED_SHAPES_KEY]) {
					for (const id of state[AWARENESS_LOCKED_SHAPES_KEY]) {
						lockedIDsSet.add(id)
					}
				}
			}
		})

		lockedShapeIDs.value = lockedIDsSet
	})

	return {
		lockedShapeIDs,
	}
}
