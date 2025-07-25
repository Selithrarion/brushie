import { useThrottleFn } from '@vueuse/core'
import { ref } from 'vue'

import type { DraftShapeBase } from '@/features/editor/edtitor-sync/types/draft.types.ts'
import { YDraftTransactions } from '@/features/editor/edtitor-sync/types/yjs.types.ts'

import { useYjs } from './useYjs.ts'

let _syncDraftShapes: ReturnType<typeof useSyncDraftShapes> | null = null

// TODO: types ?
export function getSyncDraftShapes() {
	if (!_syncDraftShapes) _syncDraftShapes = useSyncDraftShapes()
	return _syncDraftShapes
}

export function useSyncDraftShapes<TShape extends DraftShapeBase>() {
	const { ydoc } = useYjs()
	const yDrafts = ydoc.getArray<TShape>('drafts')
	const drafts = ref<TShape[]>([])

	let syncing = false

	function add(draft: TShape) {
		syncing = true
		ydoc.transact(() => {
			yDrafts.push([draft])
		}, YDraftTransactions.PUSH)
		syncing = false
	}

	const updateThrottle = useThrottleFn(update, 16)
	function update(index: number, draft: TShape) {
		syncing = true
		ydoc.transact(() => {
			yDrafts.delete(index, 1)
			yDrafts.insert(index, [draft])
		}, YDraftTransactions.UPDATE)
		syncing = false
	}

	function remove(index: number) {
		syncing = true
		ydoc.transact(() => {
			yDrafts.delete(index, 1)
		}, YDraftTransactions.REMOVE)
		syncing = false
	}

	function clear() {
		syncing = true
		ydoc.transact(() => {
			yDrafts.delete(0, yDrafts.length)
		}, YDraftTransactions.CLEAR)
		syncing = false
	}

	yDrafts.observe(($event) => {
		if (syncing) return
		syncing = true

		let index = 0

		for (const change of $event.changes.delta) {
			if (change.retain) index += change.retain
			if (change.insert) {
				drafts.value.splice(index, 0, ...change.insert)
				index += change.insert.length
			}
			if (change.delete) {
				drafts.value.splice(index, change.delete)
			}
		}

		syncing = false
	})

	return {
		drafts,
		add,
		update: updateThrottle,
		remove,
		clear,
	}
}
