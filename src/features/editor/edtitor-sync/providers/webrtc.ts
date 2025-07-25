import { WebrtcProvider } from 'y-webrtc'
import * as Y from 'yjs'

// cd ./node_modules/y-webrtc
// node ./bin/server.js
export function initWebrtcProvider(room: string, ydoc: Y.Doc) {
	return new WebrtcProvider(room, ydoc, {
		signaling: [import.meta.env.VITE_SIGNALING_URL || 'ws://localhost:4444'],
	})
}
