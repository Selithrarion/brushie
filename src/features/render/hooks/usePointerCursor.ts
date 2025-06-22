import { watchEffect, type Ref } from 'vue'

import type { useBoundingBox } from '@/features/render/hooks/useBoundingBox.ts'
import type { usePan3D } from '@/features/render/hooks/usePan3D.ts'
import type { useToolManager } from '@/features/render/hooks/useToolManager.ts'
import { HandleName } from '@/features/render/types/BoundingBox.ts'
import { ToolName } from '@/features/render/types/Tool'

export function usePointerCursor(
	containerRef: Ref<HTMLElement | undefined>,
	boundingBox: ReturnType<typeof useBoundingBox>,
	pan: ReturnType<typeof usePan3D>,
	toolManager: ReturnType<typeof useToolManager>,
	isSpacePressed: Ref<boolean>,
) {
	watchEffect(() => {
		if (!containerRef.value) return

		let cursor = 'default'

		const handle = boundingBox.activeHandle.value || boundingBox.hoverHandle.value
		if (handle) {
			switch (handle) {
				case HandleName.ROTATE:
					cursor = 'crosshair'
					break
				case HandleName.MOVE:
					cursor = 'move'
					break
				case HandleName.TL:
				case HandleName.BR:
					cursor = 'nwse-resize'
					break
				case HandleName.TR:
				case HandleName.BL:
					cursor = 'nesw-resize'
					break
				default:
					cursor = 'default'
			}
		} else if (boundingBox.hoveredShapeID.value) {
			cursor = 'pointer'
		} else if (boundingBox.isDragging.value) {
			cursor = 'grabbing'
		} else if (pan.isPanning.value) {
			cursor = 'grabbing'
		} else if (toolManager.selectedTool.value === ToolName.HAND || isSpacePressed.value) {
			cursor = 'grab'
		}

		containerRef.value.style.cursor = cursor
	})
}
