import type { PositionXY } from '@/shared/types/PositionXY.ts'

export enum ShapeType {
	RECT = 'rect',
	ELLIPSE = 'ellipse',
	LINE = 'line',
	ARROW = 'arrow',
	PENCIL = 'pencil',
}

export interface BaseShape {
	id: string
	type: ShapeType
	color: string
}

export interface RectShape extends BaseShape {
	type: ShapeType.RECT
	x1: number
	y1: number
	x2: number
	y2: number
	rotation: number
}

export interface EllipseShape extends BaseShape {
	type: ShapeType.ELLIPSE
	x1: number
	y1: number
	x2: number
	y2: number
	rotation: number
}

export interface LineShape extends BaseShape {
	type: ShapeType.LINE
	x1: number
	y1: number
	x2: number
	y2: number
}

export interface ArrowShape extends BaseShape {
	type: ShapeType.ARROW
	x1: number
	y1: number
	x2: number
	y2: number
}

export interface PencilShape extends BaseShape {
	type: ShapeType.PENCIL
	points: PositionXY[]
	lineWidth: number
}

export type BoxShape = RectShape | EllipseShape

export type StrokeShape = LineShape | ArrowShape

export type Shape = BoxShape | StrokeShape | PencilShape
