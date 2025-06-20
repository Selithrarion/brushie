import { ref } from 'vue'

import type { PositionXY } from '@/shared/types/PositionXY.ts'

export function usePanInteraction() {
	const isPanning = ref(false)
	const lastPanPos = ref<PositionXY>({ x: 0, y: 0 })

	function startPan(position: PositionXY) {
		isPanning.value = true
		lastPanPos.value = position
	}

	function updatePan(mousePosition: PositionXY, currentOffset: PositionXY, draw: () => void) {
		if (!isPanning.value) return false

		const dx = mousePosition.x - lastPanPos.value.x
		const dy = mousePosition.y - lastPanPos.value.y
		currentOffset.x += dx
		currentOffset.y += dy
		lastPanPos.value = { x: mousePosition.x, y: mousePosition.y }

		draw()

		return true
	}

	function endPan() {
		isPanning.value = false
	}

	return {
		isPanning,
		lastPanPos,
		startPan,
		updatePan,
		endPan,
	}
}
