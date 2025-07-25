import { useEventListener } from '@vueuse/core'
import { type Ref } from 'vue'

import type { ShapeDrafts } from '@/features/editor/editor-shapes/hooks/useShapeDraft.ts'

interface Dependencies {
	drafts?: ShapeDrafts
	requestDraw?: Ref<() => void>
}

export function useUndoRedo(undoFn: () => void, redoFn: () => void, deps?: Dependencies) {
	function handleUndo() {
		undoFn()
		if (deps?.drafts) {
			Object.values(deps?.drafts)?.forEach((draft) => {
				if (draft.isActive()) draft.clear()
			})
		}
		deps?.requestDraw?.value()
	}

	function handleRedo() {
		redoFn()
		deps?.requestDraw?.value()
	}

	useEventListener(window, 'keydown', onKeydown)
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
}
