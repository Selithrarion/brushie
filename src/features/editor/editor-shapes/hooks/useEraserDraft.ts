import * as THREE from 'three'
import { type Ref, ref, watch } from 'vue'

import type { useMeshesManager } from '@/features/editor/editor-core/hooks/useMeshesManager.ts'
import type { useShapeCore } from '@/features/editor/editor-shapes/hooks/useShapeCore.ts'
import { type DraftTool, useShapeDraft } from '@/features/editor/editor-shapes/hooks/useShapeDraft.ts'
import { type PencilShape, ShapeType } from '@/features/editor/types/shape.types.ts'
import { COLORS } from '@/shared/constants/colors.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'

export type EraserDraftTool = DraftTool<PencilShape> & { erasedIDs: Ref<Set<string>> }

interface Deps {
	shapeCore: ReturnType<typeof useShapeCore>
	meshesManager: ReturnType<typeof useMeshesManager>
	meshes: Map<string, THREE.Object3D>
}

export function useEraserDraft(deps: Deps): EraserDraftTool {
	const erasedIDs = ref(new Set<string>())

	const tool = useShapeDraft<PencilShape, [PositionXY]>({
		createShape: deps.shapeCore.createShape,
		createInitialDraft(pos) {
			return {
				id: 'draft-erase-' + crypto.randomUUID(),
				type: ShapeType.PENCIL,
				points: [pos],
				color: COLORS.tool.eraser,
				lineWidth: 15,
			}
		},
		updateDraft(draft, pos) {
			if (!draft.value) return

			draft.value.points.push(pos)

			const MAX_POINTS = 5
			if (draft.value.points.length > MAX_POINTS) {
				draft.value.points.shift()
			}

			const shape = deps.shapeCore.findShapeAtPos3D(pos)
			if (shape) erasedIDs.value.add(shape.id)
		},
		validateDraft(draft) {
			return draft.points.length > 3
		},
	})

	tool.commit = () => {
		if (erasedIDs.value.size) deps.shapeCore.removeByIDs([...erasedIDs.value])
		tool.clear()
	}

	function clear() {
		erasedIDs.value = new Set()
		tool.clear()
	}

	let previousErasedIDs = new Set<string>()
	watch(
		() => erasedIDs,
		(currentIDs) => {
			const added = [...currentIDs.value].filter((id) => !previousErasedIDs.has(id))
			const removed = [...previousErasedIDs].filter((id) => !currentIDs.value.has(id))

			for (const id of added) {
				const mesh = deps.meshes.get(id)
				if (mesh) deps.meshesManager.updateOpacity(mesh, 0.5)
			}
			for (const id of removed) {
				const mesh = deps.meshes.get(id)
				if (mesh) deps.meshesManager.updateOpacity(mesh, 1)
			}

			previousErasedIDs = new Set(currentIDs.value)
		},
		{ deep: true },
	)

	return {
		...tool,
		erasedIDs,
		clear,
	}
}
