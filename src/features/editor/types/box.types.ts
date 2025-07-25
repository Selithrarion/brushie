export enum HandleName {
	TL = 'tl',
	TR = 'tr',
	BR = 'br',
	BL = 'bl',

	MOVE = 'move',
	ROTATE = 'rotate',

	LINE_START = 'start',
	LINE_END = 'end',
}

export interface HandleOption {
	x: number
	y: number
	hitArea?: Box
}

export interface Box {
	x1: number
	y1: number
	x2: number
	y2: number
}
export interface RawBoundingBox extends Box {
	shapeIDs: string[]
	rotation: number
}
export interface BoundingBox extends RawBoundingBox {
	width: number
	height: number
	centerX: number
	centerY: number
}
