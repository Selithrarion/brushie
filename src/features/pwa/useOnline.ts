import { useEventListener } from '@vueuse/core'
import { ref } from 'vue'

const isOnline = ref(navigator.onLine)

function handleOnline() {
	isOnline.value = true
}
function handleOffline() {
	isOnline.value = false
}

useEventListener(window, 'online', handleOnline)
useEventListener(window, 'offline', handleOffline)

export function useOnline() {
	return { isOnline }
}
