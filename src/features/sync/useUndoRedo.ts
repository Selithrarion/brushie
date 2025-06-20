import { onMounted, onBeforeUnmount } from 'vue'

export function useUndoRedo(undoFn: () => void, redoFn: () => void) {
	function onKeydown($event: KeyboardEvent) {
		const isMac = navigator.userAgent.includes('Mac')
		const ctrl = isMac ? $event.metaKey : $event.ctrlKey
		if (ctrl && $event.key === 'z') {
			$event.preventDefault()
			undoFn()
		} else if (ctrl && ($event.key === 'y' || (isMac && $event.shiftKey && $event.key === 'z'))) {
			$event.preventDefault()
			redoFn()
		}
	}
	onMounted(() => window.addEventListener('keydown', onKeydown))
	onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
