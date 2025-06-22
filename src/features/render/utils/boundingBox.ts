import type { RawBoundingBox } from '@/features/render/types/BoundingBox.ts'
import { type Shape, ShapeType } from '@/features/render/types/Shape.ts'

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
		rotation: shape.rotation || 0,
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
