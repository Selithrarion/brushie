import { ref } from 'vue'

import { useZoom2D } from '@/features/render/2d/useZoom2D.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'

export function usePan2D(zoom: ReturnType<typeof useZoom2D>) {
	const isPanning = ref(false)
	const lastPanPos = ref<PositionXY>({ x: 0, y: 0 })

	function startPan(position: PositionXY) {
		isPanning.value = true
		lastPanPos.value = position
	}

	function updatePan(mousePosition: PositionXY) {
		if (!isPanning.value) return false

		const dx = mousePosition.x - lastPanPos.value.x
		const dy = mousePosition.y - lastPanPos.value.y
		zoom.offset.value.x += dx
		zoom.offset.value.y += dy
		lastPanPos.value = { x: mousePosition.x, y: mousePosition.y }

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
