import { ref, type Ref } from 'vue'

import type { EraserDraftTool } from '@/features/editor/editor-shapes/hooks/useEraserDraft.ts'
import type { LineStartArgs } from '@/features/editor/editor-shapes/hooks/useLineDraft.ts'
import type { PencilStartArgs } from '@/features/editor/editor-shapes/hooks/usePencilDraft.ts'
import type { CreateShapeFn, CreateShapeOptions } from '@/features/editor/editor-shapes/hooks/useShapeCore.ts'
import type { TShapeDraft } from '@/features/editor/edtitor-sync/types/draft.types.ts'
import { getSyncDraftShapes } from '@/features/editor/edtitor-sync/useSyncDraftShapes.ts'
import { useYjs } from '@/features/editor/edtitor-sync/useYjs.ts'
import type { PencilShape, StrokeShape } from '@/features/editor/types/shape.types.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'

type Options<TShape, TStartArgs extends unknown[]> = {
	createShape: CreateShapeFn
	createInitialDraft: (...args: TStartArgs) => TShape
	updateDraft: (draft: Ref<TShape | null>, pos: PositionXY) => void
	validateDraft?: (draft: TShape) => boolean
}

export type ShapeDrafts = {
	line?: ReturnType<typeof useShapeDraft<StrokeShape, LineStartArgs>>
	pencil?: ReturnType<typeof useShapeDraft<PencilShape, PencilStartArgs>>
	eraser?: EraserDraftTool
}

export interface DraftTool<TShape> {
	shape: Ref<TShape | null>
	start(...args: unknown[]): void
	update(pos: PositionXY): void
	commit(): void
	clear(): void
	isActive(): boolean
}

export function useShapeDraft<TShape extends CreateShapeOptions, TStartArgs extends unknown[]>(
	options: Options<TShape, TStartArgs>,
): DraftTool<TShapeDraft<TShape>> {
	const yjs = useYjs()
	const syncDraftShapes = getSyncDraftShapes()

	const shape: Ref<TShapeDraft<TShape> | null> = ref(null)

	function start(...args: TStartArgs) {
		const draft = options.createInitialDraft(...args)
		shape.value = {
			...draft,
			authorID: yjs.localClientID,
		}
		if (shape.value) syncDraftShapes.add(shape.value)
	}

	function update(pos: PositionXY) {
		if (!shape.value) return
		options.updateDraft(shape, pos)
		void syncDraftShapes.update(syncDraftShapes.drafts.value.length - 1, shape.value)
	}

	function clear() {
		shape.value = null
		syncDraftShapes.remove(syncDraftShapes.drafts.value.length - 1)
	}

	function commit() {
		if (!shape.value) {
			clear()
			return
		}

		if (options.validateDraft && !options.validateDraft(shape.value)) {
			clear()
			return
		}

		options.createShape(shape.value)
		clear()
	}

	function isActive() {
		return Boolean(shape.value)
	}

	return { shape, start, update, clear, commit, isActive }
}
