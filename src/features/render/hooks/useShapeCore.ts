import * as THREE from 'three'
import { type Ref, type ShallowRef, toRaw } from 'vue'

import type { usePointer3DTools } from '@/features/render/hooks/usePointer3DTools.ts'
import { type Shape, ShapeType } from '@/features/render/types/Shape.ts'
import { YShapeTransactions } from '@/features/sync/types/transactions.ts'
import { useYShapes } from '@/features/sync/useYShapes.ts'
import { saveShapeDB } from '@/shared/services/database.service.ts'
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
	arrowSize?: number
	// 	TODO: only for pencil
	points?: PositionXY[]
	lineWidth?: number
}

export function useShapeCore(
	meshes: Map<string, THREE.Mesh>,
	rendererRef: ShallowRef<THREE.WebGLRenderer | null>,
	cameraRef: Ref<THREE.OrthographicCamera | null>,
	pointer3DTools: ReturnType<typeof usePointer3DTools>,
) {
	const { ydoc, shapes, shapeMap, yShapes } = useYShapes()

	function findShapeAtPos3D(pos: PositionXY, isWorldPos = true): Shape | null | undefined {
		if (!rendererRef.value || !cameraRef.value) return null

		let screenPos: PositionXY
		if (isWorldPos) screenPos = pointer3DTools.worldToScreen(pos)
		else screenPos = pos

		const intersects = pointer3DTools.raycasterIntersect(
			{ clientX: screenPos.x, clientY: screenPos.y } as MouseEvent,
			Array.from(meshes.values()),
		)

		if (intersects.length > 0) {
			const object = intersects[0].object
			return shapeMap.value.get(object.userData.id)
		}

		return null
	}

	function findShapeIndexByID(id: string): number {
		for (let i = 0; i < yShapes.length; i++) {
			if (yShapes.get(i).id === id) return i
		}
		return -1
	}

	const createShape: CreateShapeFn = (options: CreateShapeOptions = {}): Shape => {
		const type = options.type || ShapeType.RECT
		let shape: Shape

		switch (type) {
			case ShapeType.RECT:
				if (options.x1 === undefined || options.y1 === undefined) {
					throw new Error('createShape: missing coordinates for RECT')
				}
				shape = {
					id: crypto.randomUUID(),
					type: ShapeType.RECT,
					x1: options.x1,
					y1: options.y1,
					x2: options.x2 || options.x1 + 60,
					y2: options.y2 || options.y1 + 60,
					color: options.color || getRandomPastelColor(),
					rotation: options.rotation || 0,
				}
				break
			case ShapeType.ELLIPSE:
				if (options.x1 === undefined || options.y1 === undefined) {
					throw new Error('createShape: missing coordinates for ELLIPSE')
				}
				shape = {
					id: crypto.randomUUID(),
					type: ShapeType.ELLIPSE,
					x1: options.x1,
					y1: options.y1,
					x2: options.x2 || options.x1 + 60,
					y2: options.y2 || options.y1 + 60,
					color: options.color || getRandomPastelColor(),
					rotation: options.rotation || 0,
				}
				break
			case ShapeType.LINE:
				if (options.x1 === undefined || options.y1 === undefined || options.x2 === undefined || options.y2 === undefined) {
					throw new Error('createShape: missing coordinates for LINE')
				}
				shape = {
					id: crypto.randomUUID(),
					type: ShapeType.LINE,
					x1: options.x1,
					y1: options.y1,
					x2: options.x2,
					y2: options.y2,
					color: options.color || getRandomPastelColor(),
				}
				break

			case ShapeType.ARROW:
				if (options.x1 === undefined || options.y1 === undefined || options.x2 === undefined || options.y2 === undefined) {
					throw new Error('createShape: missing coordinates for ARROW')
				}
				if (options.arrowSize === undefined) {
					throw new Error('createShape: missing arrowSize for ARROW')
				}
				shape = {
					id: crypto.randomUUID(),
					type: ShapeType.ARROW,
					x1: options.x1,
					y1: options.y1,
					x2: options.x2,
					y2: options.y2,
					color: options.color || getRandomPastelColor(),
					arrowSize: options.arrowSize,
				}
				break
			case ShapeType.PENCIL:
				if (!options.points || options.points.length < 2) {
					throw new Error('createShape: missing or invalid points for PENCIL')
				}
				shape = {
					id: crypto.randomUUID(),
					type: ShapeType.PENCIL,
					points: options.points,
					color: options.color || getRandomPastelColor(),
					lineWidth: options.lineWidth || 5,
				}
				break
			default:
				throw new Error(`useShapeCore: Invalid shape type ${type}`)
		}

		ydoc.transact(() => {
			console.log(shape)
			yShapes.push([shape])
		}, YShapeTransactions.CREATE)

		return shape
	}

	function deleteShape(id: string) {
		const idx = findShapeIndexByID(id)
		if (idx >= 0) ydoc.transact(() => yShapes.delete(idx, 1), YShapeTransactions.DELETE)
	}
	function deleteByIDs(ids: string[]) {
		ydoc.transact(() => {
			for (const id of ids) {
				const idx = findShapeIndexByID(id)
				if (idx >= 0) {
					yShapes.delete(idx, 1)
				}
			}
		}, YShapeTransactions.DELETE)
	}

	let pendingShapes: { shape: Shape; index: number }[] = []
	let frameID: number | null = null
	function scheduleSync(shape: Shape) {
		const index = shapes.value.findIndex((s) => s.id === shape.id)
		if (index < 0) return

		const existing = pendingShapes.find((p) => p.index === index)
		if (existing) existing.shape = shape
		else pendingShapes.push({ shape, index })

		if (frameID) return
		frameID = requestAnimationFrame(() => {
			movePendingShapes()
			frameID = null
		})
	}

	function movePendingShapes(transaction: YShapeTransactions.UPDATE_MOVE | YShapeTransactions.UPDATE = YShapeTransactions.UPDATE_MOVE) {
		ydoc.transact(() => {
			for (const { shape, index } of pendingShapes) {
				yShapes.delete(index, 1)
				yShapes.insert(index, [toRaw(shape)])
			}
			pendingShapes.length = 0
		}, transaction)
	}

	async function saveShapesByIDs(shapeIDs: string[]) {
		const shapesToSave = shapeIDs.map((id) => shapeMap.value.get(id)).filter(Boolean) as Shape[]
		await Promise.all(shapesToSave.map((shape) => saveShapeDB(shape)))
	}

	async function handleMouseUp() {
		if (pendingShapes.length > 0) {
			movePendingShapes(YShapeTransactions.UPDATE)
			for (const { shape } of pendingShapes) {
				void saveShapeDB(shape)
			}
		}
		pendingShapes = []
	}

	return {
		shapes,
		shapeMap,
		handleMouseUp,
		createShape,
		deleteShape,
		deleteByIDs,
		scheduleSync,
		findShapeAtPos3D,
		saveShapesByIDs,
	}
}
