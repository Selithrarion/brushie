import type { PositionXY } from '@/shared/types/PositionXY.ts'

export function localToWorld(pos: PositionXY, angle: number, center?: PositionXY): PositionXY {
	const cos = Math.cos(angle)
	const sin = Math.sin(angle)
	const x = pos.x * cos - pos.y * sin
	const y = pos.x * sin + pos.y * cos
	return center ? { x: x + center.x, y: y + center.y } : { x, y }
}

export function worldToLocal(pos: PositionXY, angle: number, center?: PositionXY): PositionXY {
	const dx = center ? pos.x - center.x : pos.x
	const dy = center ? pos.y - center.y : pos.y
	const cos = Math.cos(-angle)
	const sin = Math.sin(-angle)
	return {
		x: dx * cos - dy * sin,
		y: dx * sin + dy * cos,
	}
}

export function translatePoint(p: PositionXY, dx: number, dy: number): PositionXY {
	return { x: p.x + dx, y: p.y + dy }
}

export function rotateAroundPoint(p: PositionXY, angle: number, center: PositionXY): PositionXY {
	// const local = worldToLocal(p, -angle, center)
	// return localToWorld(local, angle, center)

	const cos = Math.cos(angle)
	const sin = Math.sin(angle)
	return {
		x: cos * (p.x - center.x) - sin * (p.y - center.y) + center.x,
		y: sin * (p.x - center.x) + cos * (p.y - center.y) + center.y,
	}
}
