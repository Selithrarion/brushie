import { ref } from 'vue'
import type { Awareness } from 'y-protocols/awareness'

type ClientID = string | number

export function useLockedShapes(provider: { awareness: Awareness }) {
	const localClientID: ClientID = provider.awareness.clientID
	const lockedShapeIDs = ref<Set<string>>(new Set())

	provider.awareness.on('change', () => {
		const states = provider.awareness.getStates()
		const ids = new Set<string>()
		states.forEach((state, clientID) => {
			if (clientID !== provider.awareness.clientID && state.editingShapeID) {
				ids.add(state.editingShapeID)
			}
		})
		lockedShapeIDs.value = ids
	})

	return { lockedShapeIDs, localClientID }
}
