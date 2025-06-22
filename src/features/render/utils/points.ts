import type { PositionXY } from '@/shared/types/PositionXY.ts'

// chaikin
export function smoothCurve(points: PositionXY[], iterations = 3): PositionXY[] {
	if (points.length < 3) return points

	let result = points.slice()

	for (let iter = 0; iter < iterations; iter++) {
		const newPoints: PositionXY[] = []
		newPoints.push(result[0])

		for (let i = 0; i < result.length - 1; i++) {
			const p0 = result[i]
			const p1 = result[i + 1]
			const Q: PositionXY = {
				x: 0.75 * p0.x + 0.25 * p1.x,
				y: 0.75 * p0.y + 0.25 * p1.y,
			}
			const R: PositionXY = {
				x: 0.25 * p0.x + 0.75 * p1.x,
				y: 0.25 * p0.y + 0.75 * p1.y,
			}
			newPoints.push(Q, R)
		}

		newPoints.push(result[result.length - 1])
		result = newPoints
	}

	return result
}

export function downsamplePoints(points: PositionXY[], step = 3): PositionXY[] {
	const result: PositionXY[] = []
	for (let i = 0; i < points.length; i += step) {
		result.push(points[i])
	}
	result.push(points[points.length - 1])
	return result
}
