import { ref, computed } from 'vue'
import type { Awareness } from 'y-protocols/awareness'

type ClientID = string | number

export function useLockedShapes(provider: { awareness: Awareness }) {
	const localClientID: ClientID = provider.awareness.clientID
	const lockedShapeIDs = ref<string[]>([])

	provider.awareness.on('change', () => {
		const states = provider.awareness.getStates()
		const ids: string[] = []
		states.forEach((state, clientID) => {
			if (clientID !== provider.awareness.clientID && state.editingShapeID) {
				ids.push(state.editingShapeID)
			}
		})
		lockedShapeIDs.value = ids
	})

	const lockedByOthers = computed(() => lockedShapeIDs.value)
	return { lockedShapeIDs: lockedByOthers, localClientID }
}
