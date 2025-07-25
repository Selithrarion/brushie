export enum YShapeTransactions {
	CREATE = 'createShape',
	REMOVE = 'removeShape',
	REMOVE_MANY = 'removeManyShapes',
	UPDATE = 'updateShape',
	RESET = 'resetShapes',
}

export enum YDraftTransactions {
	PUSH = 'pushDraft',
	UPDATE = 'updateDraft',
	REMOVE = 'removeDraft',
	CLEAR = 'clearDrafts',
}

export enum YRoomStatus {
	CONNECTED = 'connected',
	DISCONNECTED = 'disconnected',
}

export type AwarenessChangeEvent = {
	added: number[]
	updated: number[]
	removed: number[]
}
