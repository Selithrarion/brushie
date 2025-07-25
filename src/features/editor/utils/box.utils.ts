import type { Box, RawBoundingBox } from '@/features/editor/types/box.types.ts'
import { type Shape, ShapeType } from '@/features/editor/types/shape.types.ts'

export function computeBoundingBoxForShape(shape: Shape): RawBoundingBox {
	let x1 = Infinity,
		y1 = Infinity,
		x2 = -Infinity,
		y2 = -Infinity

	if (shape.type === ShapeType.PENCIL) {
		for (const pt of shape.points) {
			x1 = Math.min(x1, pt.x)
			y1 = Math.min(y1, pt.y)
			x2 = Math.max(x2, pt.x)
			y2 = Math.max(y2, pt.y)
		}
	} else {
		x1 = Math.min(shape.x1, shape.x2)
		y1 = Math.min(shape.y1, shape.y2)
		x2 = Math.max(shape.x1, shape.x2)
		y2 = Math.max(shape.y1, shape.y2)
	}

	return {
		shapeIDs: [shape.id],
		x1,
		y1,
		x2,
		y2,
		rotation: shape.type === ShapeType.RECT || shape.type === ShapeType.ELLIPSE ? shape.rotation : 0,
	}
}

export function mergeBoundingBoxes(boxes: RawBoundingBox[]): RawBoundingBox | null {
	if (!boxes.length) return null

	const shapeIDs = boxes.flatMap((b) => b.shapeIDs)
	let x1 = Infinity,
		y1 = Infinity,
		x2 = -Infinity,
		y2 = -Infinity

	for (const b of boxes) {
		x1 = Math.min(x1, b.x1)
		y1 = Math.min(y1, b.y1)
		x2 = Math.max(x2, b.x2)
		y2 = Math.max(y2, b.y2)
	}

	return { shapeIDs, x1, y1, x2, y2, rotation: 0 }
}

export function normalizeRect(rect: Box): Box {
	const [x1, x2] = rect.x1 < rect.x2 ? [rect.x1, rect.x2] : [rect.x2, rect.x1]
	const [y1, y2] = rect.y1 < rect.y2 ? [rect.y1, rect.y2] : [rect.y2, rect.y1]
	return {
		x1,
		x2,
		y1,
		y2,
	}
}

export function isBoxIntersect(boxA: Box, boxB: Box) {
	const a = normalizeRect(boxA)
	const b = normalizeRect(boxB)
	return !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2)
}
