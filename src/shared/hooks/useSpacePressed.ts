import { useEventListener } from '@vueuse/core'
import { ref } from 'vue'

export function useSpacePressed() {
	const isSpacePressed = ref(false)

	function onKeyDown(e: KeyboardEvent) {
		if (e.code === 'Space') {
			isSpacePressed.value = true
		}
	}
	function onKeyUp(e: KeyboardEvent) {
		if (e.code === 'Space') {
			isSpacePressed.value = false
		}
	}

	useEventListener(window, 'keydown', onKeyDown)
	useEventListener(window, 'keyup', onKeyUp)

	return { isSpacePressed }
}
