import { ref } from 'vue'
import type { WebrtcProvider } from 'y-webrtc'
import * as Y from 'yjs'

import type { Shape } from '@/features/render/types/Shape.ts'
import { initWebrtcProvider } from '@/features/sync/providers/webrtc.ts'
import { YShapeTransactions } from '@/features/sync/types/transactions.ts'

import { getShapesDB, clearShapesDB, saveShapeDB, deleteShapeDB } from '../render/db.ts'

const roomName = 'test1'
const yDocsMap = new Map<string, { ydoc: Y.Doc; provider: WebrtcProvider }>()

let entry = yDocsMap.get(roomName)
if (!entry) {
	const ydoc = new Y.Doc()
	const provider = initWebrtcProvider(roomName, ydoc)
	entry = { ydoc, provider }
	yDocsMap.set(roomName, entry)
}
const { ydoc, provider } = entry

const yShapes = ydoc.getArray<Shape>('shapes')
const shapes = ref<Shape[]>([])
const status = ref<'connected' | 'disconnected'>('disconnected')
const peersCount = ref(0)

let initialized = false

async function initDB() {
	console.log('yShapes db init', yShapes.length)
	if (yShapes.length === 0) {
		const fromDB = await getShapesDB()
		console.log(yShapes.length)
		ydoc.transact(() => {
			for (const s of fromDB) {
				yShapes.push([s])
			}
		}, YShapeTransactions.LOAD_FROM_DB)
	}
}
function init() {
	if (initialized) return
	initialized = true

	// TODO: not working properly otherwise
	setTimeout(() => {
		if (provider.connected) {
			status.value = 'connected'
			void initDB()
		}
	}, 1000)
	// TODO: not working for some reason, cant get connection status
	provider.on('status', ({ connected }) => {
		status.value = connected ? 'connected' : 'disconnected'
		console.log('provider on update', status.value)
		if (!connected) return
		void initDB()
	})
	provider.once('synced', ($event) => {
		console.log('initial sync done:', $event)
	})
	provider.on('peers', ({ webrtcPeers, bcPeers }) => {
		peersCount.value = webrtcPeers.length + bcPeers.length
	})

	const pendingSaveShapes = new Map<string, Shape>()
	const pendingDeleteShapeIDs = new Set<string>()
	let saveTimeoutID: number | null = null
	yShapes.observe(($event) => {
		console.log('yjs origin:', $event.transaction.origin)
		if ($event.transaction.origin === YShapeTransactions.UPDATE_MOVE) return
		handleShapeMutations($event)
		if ($event.transaction.origin !== YShapeTransactions.LOAD_FROM_DB) scheduleDbUpdate()
	})

	function handleShapeMutations($event: Y.YArrayEvent<Shape>) {
		// to debug
		// shapes.value = yShapes.toArray()

		let index = 0
		for (const change of $event.changes.delta) {
			console.log(change)
			if (change.retain) {
				index += change.retain
			}

			if (change.insert) {
				shapes.value.splice(index, 0, ...change.insert)
				for (const shape of change.insert) {
					pendingSaveShapes.set(shape.id, shape)
					pendingDeleteShapeIDs.delete(shape.id)
				}
				index += change.insert.length
			}

			if (change.delete) {
				for (let i = 0; i < change.delete; i++) {
					const shape = shapes.value[index + i]
					if (shape) {
						pendingDeleteShapeIDs.add(shape.id)
					}
				}
				shapes.value.splice(index, change.delete)
			}
		}
	}
	function scheduleDbUpdate() {
		if (saveTimeoutID) clearTimeout(saveTimeoutID)
		saveTimeoutID = setTimeout(async () => {
			console.log('save db timeout', pendingSaveShapes.size, pendingDeleteShapeIDs.size)
			for (const id of pendingDeleteShapeIDs) await deleteShapeDB(id)
			pendingDeleteShapeIDs.clear()

			for (const shape of pendingSaveShapes.values()) await saveShapeDB(shape)
			pendingSaveShapes.clear()

			saveTimeoutID = null
		}, 1000)
	}
}

const undoManager = new Y.UndoManager(yShapes, {
	trackedOrigins: new Set([YShapeTransactions.CREATE, YShapeTransactions.DELETE, YShapeTransactions.UPDATE, YShapeTransactions.RESET]),
})
function undo() {
	console.log('Undo')
	undoManager.undo()
}
function redo() {
	console.log('Redo')
	undoManager.redo()
}

function reconnect() {
	provider.disconnect()
	setTimeout(() => {
		provider.connect()
	}, 1000)
}
function resetRoom() {
	ydoc.transact(() => {
		yShapes.delete(0, yShapes.length)
	}, YShapeTransactions.RESET)
	void clearShapesDB()
}

export function useYShapes() {
	init()
	return { ydoc, provider, yShapes, shapes, status, peersCount, undo, redo, reconnect, resetRoom }
}
