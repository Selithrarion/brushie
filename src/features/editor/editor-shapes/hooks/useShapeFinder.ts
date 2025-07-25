import { type Ref, watch } from 'vue'

import { type Shape, ShapeType } from '@/features/editor/types/shape.types.ts'
import { computeBoundingBoxForShape } from '@/features/editor/utils/box.utils.ts'
import { getPointToSegmentDistance } from '@/features/math/geometry.ts'
import { worldToLocal } from '@/features/math/transform.ts'
import { QuadtreeService } from '@/shared/services/quadtree.service.ts'

export function useShapeFinder(shapesRef: Ref<Shape[]>) {
	const quadtree = new QuadtreeService<Shape>((shape) => computeBoundingBoxForShape(shape), {
		x: 0,
		y: 0,
		width: 5000,
		height: 5000,
	})

	// NOTE: working ok (~0.3ms for 100 shapes)
	// quadtree library doesnt have remove/update methods so we cannot update only active shapes
	watch(
		shapesRef,
		(shapes) => {
			quadtree.clear()
			quadtree.insert(shapes)
		},
		{ immediate: true, deep: true },
	)

	function findShapeAtPos(x: number, y: number) {
		const nearby = quadtree.find({ x, y })
		let closestShape: Shape | null = null
		let minDist = Infinity

		for (const shape of nearby) {
			if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
				const dist = getPointToSegmentDistance(x, y, shape.x1, shape.y1, shape.x2, shape.y2)
				if (dist < 10 && dist < minDist) {
					minDist = dist
					closestShape = shape
				}
			} else if (shape.type === ShapeType.RECT || shape.type === ShapeType.ELLIPSE) {
				const centerX = (shape.x1 + shape.x2) / 2
				const centerY = (shape.y1 + shape.y2) / 2
				const local = worldToLocal({ x, y }, -(shape.rotation || 0), { x: centerX, y: centerY })

				const width = shape.x2 - shape.x1
				const height = shape.y2 - shape.y1

				if (local.x >= -width / 2 && local.x <= width / 2 && local.y >= -height / 2 && local.y <= height / 2) {
					closestShape = shape
					break
				}
			} else if (shape.type === ShapeType.PENCIL) {
				for (let i = 0; i < shape.points.length; i += 3) {
					const pt = shape.points[i]
					const dist = Math.hypot(x - pt.x, y - pt.y)
					if (dist < 1) {
						closestShape = shape
						break
					}
				}
			}
		}
		return closestShape
	}

	return { findShapeAtPos }
}
