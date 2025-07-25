import { useThrottleFn } from '@vueuse/core'
import { ref, reactive, watch, toRaw } from 'vue'
import * as Y from 'yjs'

import { YShapeTransactions } from '@/features/editor/edtitor-sync/types/yjs.types.ts'
import { type Shape } from '@/features/editor/types/shape.types.ts'

import { useYjs } from './useYjs.ts'

const shapes = ref<Shape[]>([])
const shapeMap = reactive(new Map<string, Shape>())
watch(
	shapes,
	(newShapes) => {
		shapeMap.clear()
		for (const s of newShapes) {
			shapeMap.set(s.id, s)
		}
	},
	{ deep: true },
)

const yjs = useYjs()
const yShapes = yjs.ydoc.getArray<Shape>('shapes')

let initialized = false
function initSyncShapes() {
	if (initialized) return
	initialized = true
	shapes.value = yShapes.toArray()
}
yShapes.observe(($event) => {
	// console.log('DEBUG: yjs origin:', $event.transaction.origin)
	handleShapeMutations($event)
})

function handleShapeMutations($event: Y.YArrayEvent<Shape>) {
	// DEBUG
	// shapes.value = yShapes.toArray()

	let index = 0
	for (const change of $event.changes.delta) {
		if (change.retain) {
			index += change.retain
		}

		if (change.insert) {
			shapes.value.splice(index, 0, ...change.insert)
			index += change.insert.length
		}

		if (change.delete) {
			shapes.value.splice(index, change.delete)
		}
	}
}

function findIndexByID(id: string): number {
	for (let i = 0; i < yShapes.length; i++) {
		if (yShapes.get(i).id === id) return i
	}
	return -1
}

function push(shape: Shape) {
	yjs.ydoc.transact(() => {
		yShapes.push([shape])
	}, YShapeTransactions.CREATE)
}

// NOTE: throttle 16 ms is breaking it
function update(shape: Shape) {
	const index = findIndexByID(shape.id)
	if (index < 0) {
		console.warn('update: index not found for', shape)
		return
	}

	yjs.ydoc.transact(() => {
		yShapes.delete(index, 1)
		yShapes.insert(index, [toRaw(shape)])
	}, YShapeTransactions.UPDATE)
}

function remove(id: string) {
	yjs.ydoc.transact(() => {
		const index = shapes.value.findIndex((s) => s.id === id)
		if (index !== -1) yShapes.delete(index, 1)
	}, YShapeTransactions.REMOVE)
}

function removeByIDs(ids: string[]) {
	yjs.ydoc.transact(() => {
		for (const id of ids) {
			const index = findIndexByID(id)
			if (index >= 0) {
				yShapes.delete(index, 1)
			}
		}
	}, YShapeTransactions.REMOVE_MANY)
}

function resetRoom() {
	yjs.ydoc.transact(() => {
		yShapes.delete(0, yShapes.length)
	}, YShapeTransactions.RESET)
}

const undoManager = new Y.UndoManager(yShapes, {
	trackedOrigins: new Set([
		YShapeTransactions.CREATE,
		YShapeTransactions.REMOVE,
		YShapeTransactions.REMOVE_MANY,
		YShapeTransactions.UPDATE,
		YShapeTransactions.RESET,
	]),
})
function undo() {
	console.log('Undo')
	undoManager.undo()
}
function redo() {
	console.log('Redo')
	undoManager.redo()
}

yjs.indexeddbProvider?.on('synced', () => {
	console.log('SYNCED: indexed db loaded')
	shapes.value = yShapes.toArray()
})

export function useSyncShapes() {
	initSyncShapes()

	return {
		shapes,
		shapeMap,

		findIndexByID,
		push,
		remove,
		removeByIDs,

		update,

		resetRoom,

		undoManager,
		undo,
		redo,
	}
}
