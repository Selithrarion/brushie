import type { RectShape } from '@/features/editor/types/shape.types.ts'

export interface GameShape extends RectShape {
	meta?: {
		hitPoints?: number
	}
}
