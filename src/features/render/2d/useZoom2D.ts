import { ref } from 'vue'

import type { PositionXY } from '@/shared/types/PositionXY.ts'

export function useZoom2D() {
	const scale = ref(1)
	const offset = ref({ x: 0, y: 0 })

	const MIN_SCALE = 0.1
	const MAX_SCALE = 10

	function zoomAtPoint(point: PositionXY, delta: number, canvas: HTMLCanvasElement) {
		if (!canvas) return

		const newScale = scale.value * delta
		const clamped = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE)

		const x0 = (point.x - offset.value.x) / scale.value
		const y0 = (point.y - offset.value.y) / scale.value

		scale.value = clamped
		offset.value.x = point.x - x0 * clamped
		offset.value.y = point.y - y0 * clamped
	}

	function zoomAtCenter(delta: number, canvas: HTMLCanvasElement) {
		if (!canvas) return

		const rect = canvas.getBoundingClientRect()
		const px = rect.width / 2
		const py = rect.height / 2

		zoomAtPoint({ x: px, y: py }, delta, canvas)
	}

	function handleWheel(e: WheelEvent, canvas: HTMLCanvasElement) {
		if (!canvas) return

		const rect = canvas.getBoundingClientRect()
		const px = e.clientX - rect.left
		const py = e.clientY - rect.top

		const delta = e.deltaY < 0 ? 1.1 : 0.9

		zoomAtPoint({ x: px, y: py }, delta, canvas)
	}

	function getWorldPos2D(p: PositionXY): PositionXY {
		return {
			x: (p.x - offset.value.x) / scale.value,
			y: (p.y - offset.value.y) / scale.value,
		}
	}

	function resetZoom() {
		scale.value = 1
	}

	return {
		scale,
		offset,
		zoomAtPoint,
		zoomAtCenter,
		handleWheel,
		getWorldPos2D,
		resetZoom,
	}
}
