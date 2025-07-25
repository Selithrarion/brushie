import Quadtree from '@timohausmann/quadtree-js'

import type { PositionXY } from '@/shared/types/PositionXY.ts'

export class QuadtreeService<T> {
	private qt: Quadtree

	constructor(
		private getBox: (item: T) => { x1: number; y1: number; x2: number; y2: number },
		bounds: { x: number; y: number; width: number; height: number },
	) {
		this.qt = new Quadtree(bounds, 5, 10)
	}

	clear() {
		this.qt.clear()
	}

	insert(items: T[]) {
		this.clear()
		items.forEach((item) => {
			const box = this.getBox(item)
			this.qt.insert({
				x: box.x1,
				y: box.y1,
				width: box.x2 - box.x1,
				height: box.y2 - box.y1,
				item,
			})
		})
	}

	find(pos: PositionXY, threshold = 10): T[] {
		return this.qt
			.retrieve({
				x: pos.x - threshold,
				y: pos.y - threshold,
				width: threshold * 2,
				height: threshold * 2,
			})
			.map((q) => q.item as T)
	}
}
