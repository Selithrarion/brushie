import { ref } from 'vue'
import type { WebrtcProvider } from 'y-webrtc'
import * as Y from 'yjs'

import { getShapes } from '../render/db.ts'

import type { Shape } from '@/features/render/Shape.ts'
import { initWebrtcProvider } from '@/features/sync/providers/webrtc.ts'

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

function init() {
	if (initialized) return
	initialized = true

	provider.on('status', async ({ connected }) => {
		status.value = connected ? 'connected' : 'disconnected'
		if (!connected) return

		if (yShapes.length === 0) {
			const fromDB = await getShapes()
			ydoc.transact(() => {
				shapes.value = fromDB
			})
		}
	})
	provider.once('synced', (e) => {
		console.log('initial sync done:', e)
	})
	provider.on('peers', ({ webrtcPeers, bcPeers }) => {
		peersCount.value = webrtcPeers.length + bcPeers.length
	})

	yShapes.observe((event, transaction) => {
		if (transaction.local) return

		let index = 0
		for (const change of event.changes.delta) {
			if (change.retain) index += change.retain
			if (change.insert) {
				shapes.value.splice(index, 0, ...change.insert)
				index += change.insert.length
			}
			if (change.delete) {
				shapes.value.splice(index, change.delete)
			}
		}
	})
}

const undoManager = new Y.UndoManager(yShapes)
function undo() {
	console.log('Undo')
	undoManager.undo()
}
function redo() {
	console.log('Redo')
	undoManager.redo()
}

export function useYShapes() {
	init()
	return { ydoc, provider, yShapes, shapes, status, peersCount, undo, redo }
}
