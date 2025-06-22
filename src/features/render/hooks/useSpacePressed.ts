import { ref, onMounted, onBeforeUnmount } from 'vue'

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

	onMounted(() => {
		window.addEventListener('keydown', onKeyDown)
		window.addEventListener('keyup', onKeyUp)
	})
	onBeforeUnmount(() => {
		window.removeEventListener('keydown', onKeyDown)
		window.removeEventListener('keyup', onKeyUp)
	})

	return { isSpacePressed }
}
