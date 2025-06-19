import * as Y from 'yjs'

import { initWebrtcProvider } from '@/features/sync/providers/webrtc.ts'

export function initYjs() {
	const ydoc = new Y.Doc()
	const provider = initWebrtcProvider('test', ydoc)

	return { ydoc, provider }
}
