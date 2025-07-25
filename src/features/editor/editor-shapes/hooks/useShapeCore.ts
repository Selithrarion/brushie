import * as THREE from 'three'
import { type Ref } from 'vue'

import type { usePointer3DTools } from '@/features/editor/editor-core/hooks/usePointer3DTools.ts'
import { useShapeFinder } from '@/features/editor/editor-shapes/hooks/useShapeFinder.ts'
import { useSyncShapes } from '@/features/editor/edtitor-sync/useSyncShapes.ts'
import { type Shape, ShapeType } from '@/features/editor/types/shape.types.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'
import { getRandomPastelColor } from '@/shared/utils/colors.ts'

export type CreateShapeFn = (options: CreateShapeOptions) => Shape
export interface CreateShapeOptions {
	type?: ShapeType
	color?: string
	rotation?: number
	x1?: number
	y1?: number
	x2?: number
	y2?: number
	// 	TODO: only for pencil, need to separate interfaces
	points?: PositionXY[]
	lineWidth?: number
}

export function useShapeCore(
	meshes: Map<string, THREE.Object3D>,
	renderer: Ref<THREE.WebGLRenderer | null>,
	camera: Ref<THREE.OrthographicCamera | null>,
	pointer3DTools: ReturnType<typeof usePointer3DTools>,
) {
	const syncShapes = useSyncShapes()
	const shapeFinder = useShapeFinder(syncShapes.shapes)

	function findShapeAtPos3D(pos: PositionXY, isWorldPos = true): Shape | null | undefined {
		const shape = shapeFinder.findShapeAtPos(pos.x, pos.y)
		if (!shape) return raycastFind(pos, isWorldPos)
		return shape
	}
	function raycastFind(pos: PositionXY, isWorldPos = true): Shape | null | undefined {
		if (!renderer.value || !camera.value) return null

		let screenPos: PositionXY
		if (isWorldPos) screenPos = pointer3DTools.worldToScreen(pos)
		else screenPos = pos

		const intersects = pointer3DTools.raycasterIntersect({ x: screenPos.x, y: screenPos.y }, Array.from(meshes.values()))

		if (intersects.length > 0) {
			const object = intersects[0].object
			return syncShapes.shapeMap.get(object.userData.id)
		}

		return null
	}

	const createShape: CreateShapeFn = (options: CreateShapeOptions): Shape => {
		const type = options.type ?? ShapeType.RECT
		const id = crypto.randomUUID()
		const color = options.color || getRandomPastelColor()
		const rotation = options.rotation || 0

		let shape: Shape

		const centerX = options.x1 || 0
		const centerY = options.y1 || 0
		const defaultWidth = 30
		const defaultHeight = 30

		switch (type) {
			case ShapeType.RECT:
				if (options.x1 === undefined || options.y1 === undefined) {
					throw new Error('createShape: missing coordinates for RECT')
				}
				shape = {
					id,
					type: ShapeType.RECT,
					x1: centerX - defaultWidth / 2,
					y1: centerY - defaultHeight / 2,
					x2: centerX + defaultWidth / 2,
					y2: centerY + defaultHeight / 2,
					color,
					rotation,
				}
				break
			case ShapeType.ELLIPSE:
				if (options.x1 === undefined || options.y1 === undefined) {
					throw new Error('createShape: missing coordinates for ELLIPSE')
				}
				shape = {
					id,
					type: ShapeType.ELLIPSE,
					x1: centerX - defaultWidth / 2,
					y1: centerY - defaultHeight / 2,
					x2: centerX + defaultWidth / 2,
					y2: centerY + defaultHeight / 2,
					color,
					rotation,
				}
				break
			case ShapeType.LINE:
			case ShapeType.ARROW:
				if (options.x1 === undefined || options.y1 === undefined || options.x2 === undefined || options.y2 === undefined) {
					throw new Error('createShape: missing coordinates for LINE/ARROW')
				}
				shape = {
					id,
					type,
					x1: options.x1,
					y1: options.y1,
					x2: options.x2,
					y2: options.y2,
					color,
				}
				break
			case ShapeType.PENCIL:
				if (!options.points || options.points.length < 2) {
					throw new Error('createShape: missing or invalid points for PENCIL')
				}
				shape = {
					id,
					type: ShapeType.PENCIL,
					points: options.points,
					color,
					lineWidth: options.lineWidth || 5,
				}
				break
			default:
				throw new Error(`useShapeCore: Invalid shape type ${type}`)
		}

		syncShapes.push(shape)

		return shape
	}

	return {
		shapes: syncShapes.shapes,
		shapeMap: syncShapes.shapeMap,

		createShape,
		remove: syncShapes.remove,
		removeByIDs: syncShapes.removeByIDs,
		update: syncShapes.update,

		undo: syncShapes.undo,
		redo: syncShapes.redo,
		undoManager: syncShapes.undoManager,

		findShapeAtPos3D,
	}
}
