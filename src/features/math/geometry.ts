export function getPointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
	const A = px - x1
	const B = py - y1
	const C = x2 - x1
	const D = y2 - y1
	const dot = A * C + B * D
	const len2 = C * C + D * D
	const t = Math.max(0, Math.min(1, dot / len2))
	const projX = x1 + t * C
	const projY = y1 + t * D
	return Math.hypot(px - projX, py - projY)
}
