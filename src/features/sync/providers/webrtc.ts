import { WebrtcProvider } from 'y-webrtc'
import * as Y from 'yjs'

// cd ./node_modules/y-webrtc
// node ./bin/server.js
export function initWebrtcProvider(room: string, ydoc: Y.Doc) {
	const provider = new WebrtcProvider(room, ydoc, {
		signaling: ['ws://localhost:4444'],
	})
	return provider
}
