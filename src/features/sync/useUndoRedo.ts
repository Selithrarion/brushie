import { onMounted, onBeforeUnmount, type Ref } from 'vue'

import { useLineDraft } from '@/features/render/hooks/useLineDraft.ts'
import { usePencilDraft } from '@/features/render/hooks/usePencilDraft.ts'

interface Dependencies {
	pencilDraft?: ReturnType<typeof usePencilDraft>
	lineDraft?: ReturnType<typeof useLineDraft>
	requestDraw?: Ref<() => void>
}

export function useUndoRedo(undoFn: () => void, redoFn: () => void, deps?: Dependencies) {
	function handleUndo() {
		undoFn()
		if (deps?.pencilDraft?.shape.value) deps.pencilDraft.clear()
		if (deps?.lineDraft?.shape.value) deps.lineDraft.clear()
		deps?.requestDraw?.value()
	}

	function handleRedo() {
		redoFn()
		deps?.requestDraw?.value()
	}

	function onKeydown($event: KeyboardEvent) {
		const isMac = navigator.userAgent.includes('Mac')
		const ctrl = isMac ? $event.metaKey : $event.ctrlKey

		if (ctrl && $event.key.toLowerCase() === 'z') {
			$event.preventDefault()
			if (isMac && $event.shiftKey) {
				handleRedo()
			} else {
				handleUndo()
			}
		} else if (ctrl && $event.key.toLowerCase() === 'y') {
			$event.preventDefault()
			handleRedo()
		}
	}

	onMounted(() => window.addEventListener('keydown', onKeydown))
	onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
