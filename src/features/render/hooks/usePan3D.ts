import { type Ref, ref } from 'vue'

import type { useZoom3D } from '@/features/render/hooks/useZoom3D.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'

export function usePan3D(zoom: ReturnType<typeof useZoom3D>, containerRef: Ref<HTMLDivElement | undefined>, onUpdate: Ref<() => void>) {
	const isPanning = ref(false)
	let startScreen = { x: 0, y: 0 }
	let startOffset = { x: 0, y: 0 }

	function startPan(position: PositionXY) {
		isPanning.value = true
		startScreen = { ...position }
		startOffset = { x: zoom.offset.value.x, y: zoom.offset.value.y }
	}

	function updatePan(position: PositionXY) {
		if (!isPanning.value) return false

		const dx = position.x - startScreen.x
		const dy = position.y - startScreen.y

		const w = containerRef.value!.clientWidth
		const h = containerRef.value!.clientHeight
		const aspect = w / h

		const worldWidth = (aspect * zoom.ZOOM_FACTOR) / zoom.scale.value
		const worldHeight = zoom.ZOOM_FACTOR / zoom.scale.value
		const worldDx = (dx / w) * worldWidth
		const worldDy = (dy / h) * worldHeight

		zoom.offset.value.x = startOffset.x - worldDx
		zoom.offset.value.y = startOffset.y + worldDy
		zoom.updateCameraFromZoom()
		onUpdate.value()

		return true
	}

	function endPan() {
		isPanning.value = false
	}

	const PAN_STEP = 100
	function panHorizontal(direction: 'left' | 'right') {
		if (!containerRef.value) return

		const w = containerRef.value.clientWidth
		const h = containerRef.value.clientHeight
		const aspect = w / h

		const worldWidth = (aspect * zoom.ZOOM_FACTOR) / zoom.scale.value

		const step = (PAN_STEP / w) * worldWidth
		if (direction === 'left') zoom.offset.value.x -= step
		else zoom.offset.value.x += step

		zoom.updateCameraFromZoom()
		onUpdate.value()
	}

	function panVertical(direction: 'up' | 'down') {
		if (!containerRef.value) return

		const h = containerRef.value.clientHeight
		const worldHeight = zoom.ZOOM_FACTOR / zoom.scale.value

		const step = (PAN_STEP / h) * worldHeight
		if (direction === 'up') zoom.offset.value.y += step
		else zoom.offset.value.y -= step

		zoom.updateCameraFromZoom()
		onUpdate.value()
	}
	return { isPanning, startPan, updatePan, endPan, panHorizontal, panVertical }
}
