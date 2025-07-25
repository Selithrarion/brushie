import { watchEffect, type Ref } from 'vue'

import type { usePan3D } from '@/features/editor/editor-core/hooks/usePan3D.ts'
import type { useBoundingBox } from '@/features/editor/editor-shapes/hooks/useBoundingBox.ts'
import type { useToolManager } from '@/features/editor/editor-ui/hooks/useToolManager.ts'
import type { useRemoteSelection } from '@/features/editor/edtitor-sync/useRemoteSelection.ts'
import { HandleName } from '@/features/editor/types/box.types.ts'
import { ToolName } from '@/features/editor/types/tool.types.ts'

export function usePointerCursor(
	containerRef: Ref<HTMLElement | null>,
	boundingBox: ReturnType<typeof useBoundingBox>,
	pan: ReturnType<typeof usePan3D>,
	toolManager: ReturnType<typeof useToolManager>,
	remoteSelection: ReturnType<typeof useRemoteSelection>,
	lockedShapeIDs: Ref<Set<string>>,
	isSpacePressed: Ref<boolean>,
) {
	watchEffect(() => {
		if (!containerRef.value) return

		const hoveredID = boundingBox.hoveredShapeID.value
		if (hoveredID && lockedShapeIDs.value.has(hoveredID)) return 'default'

		let cursor = 'default'
		const handle = boundingBox.activeHandle.value || boundingBox.hoverHandle.value

		if (boundingBox.isDragging.value) {
			cursor = 'grabbing'
		} else if (handle) {
			switch (handle) {
				case HandleName.ROTATE:
					cursor = 'crosshair'
					break
				case HandleName.MOVE:
					cursor = 'grab'
					break
				case HandleName.TL:
				case HandleName.BR:
					cursor = 'nwse-resize'
					break
				case HandleName.TR:
				case HandleName.BL:
					cursor = 'nesw-resize'
					break
				case HandleName.LINE_START:
				case HandleName.LINE_END:
					cursor = 'pointer'
					break
				default:
					cursor = 'default'
			}
		} else if (boundingBox.hoveredShapeID.value) {
			cursor = 'grab'
		} else if (pan.isPanning.value) {
			cursor = 'grabbing'
		} else if (toolManager.selectedTool.value === ToolName.HAND || isSpacePressed.value) {
			cursor = 'grab'
		} else if (toolManager.selectedTool.value !== ToolName.SELECT) {
			cursor = 'pointer'
		}

		containerRef.value.style.cursor = cursor
	})
}
