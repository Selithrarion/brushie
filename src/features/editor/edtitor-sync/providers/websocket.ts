import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

export function initWebsocketProvider(room: string, ydoc: Y.Doc) {
	return new WebsocketProvider('ws://localhost:1234', room, ydoc)
}
