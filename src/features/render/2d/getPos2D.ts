import type { PositionXY } from '@/shared/types/PositionXY.ts'

export function getPos2D($event: MouseEvent, el: HTMLCanvasElement | null): PositionXY {
	if (!el) return { x: 0, y: 0 }

	const rect = el.getBoundingClientRect()
	const scaleX = el.width / rect.width
	const scaleY = el.height / rect.height

	return {
		x: ($event.clientX - rect.left) * scaleX,
		y: ($event.clientY - rect.top) * scaleY,
	}
}
