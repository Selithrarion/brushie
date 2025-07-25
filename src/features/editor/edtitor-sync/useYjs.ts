import { ref } from 'vue'
import { IndexeddbPersistence } from 'y-indexeddb'
import type { WebrtcProvider } from 'y-webrtc'
import * as Y from 'yjs'

import { initWebrtcProvider } from '@/features/editor/edtitor-sync/providers/webrtc.ts'
import { YRoomStatus } from '@/features/editor/edtitor-sync/types/yjs.types.ts'

// TODO: hook race ?
const tempRoomID = 'test1'

let ydoc: Y.Doc | null = null
let provider: WebrtcProvider | null = null
let indexeddbProvider: IndexeddbPersistence | null = null
const currentRoomID = ref<string | null>(null)

const status = ref<YRoomStatus>(YRoomStatus.DISCONNECTED)
const peersCount = ref(0)
let initialized = false

function initYjs(roomID?: string) {
	roomID = tempRoomID

	if (ydoc && provider) return { ydoc, provider, status, peersCount }
	else if (!roomID) {
		throw new Error('Room ID not provided')
	}

	ydoc = new Y.Doc()
	provider = initWebrtcProvider(roomID, ydoc)
	currentRoomID.value = roomID

	indexeddbProvider = new IndexeddbPersistence(roomID, ydoc)

	// TODO: cant get connection status and synced event
	setTimeout(() => {
		if (provider!.connected) {
			status.value = YRoomStatus.CONNECTED
		}
	}, 1000)
	provider.on('status', ({ connected }) => {
		status.value = connected ? YRoomStatus.CONNECTED : YRoomStatus.DISCONNECTED
	})
	provider.on('peers', ({ webrtcPeers, bcPeers }) => {
		peersCount.value = webrtcPeers.length + bcPeers.length
	})
	provider.once('synced', ($event) => {
		console.log('initial sync done:', $event)
	})

	return { ydoc, provider, status, peersCount }
}

function reconnect() {
	if (!provider) return

	provider.disconnect()
	setTimeout(() => {
		provider?.connect?.()
	}, 1000)
}

window.addEventListener('beforeunload', () => {
	provider?.awareness?.setLocalState(null)
})

// options: { init?: boolean; roomID?: number } = {}
export function useYjs() {
	// options.init &&
	if (!initialized) {
		initYjs()
		initialized = true
	}

	return {
		initialized,
		ydoc: ydoc!,
		provider: provider!,
		indexeddbProvider,

		currentRoomID,
		status,
		peersCount,
		localClientID: provider!.awareness!.clientID,

		reconnect,
	}
}
