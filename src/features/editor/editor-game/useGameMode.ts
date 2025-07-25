import { ref } from 'vue'

const isGameMode = ref(false)

function toggleGame() {
	isGameMode.value = !isGameMode.value
}

function setGameMode(v: boolean) {
	isGameMode.value = v
}

export function useGameMode() {
	return {
		isGameMode,
		toggleGame,
		setGameMode,
	}
}
