import { useEventListener, useMouse } from '@vueuse/core'
import { nextTick, type Ref } from 'vue'

import { usePan3D } from '@/features/editor/editor-core/hooks/usePan3D.ts'
import { usePointer3DTools } from '@/features/editor/editor-core/hooks/usePointer3DTools.ts'
import { useZoom3D } from '@/features/editor/editor-core/hooks/useZoom3D.ts'
import type { useGameLayer } from '@/features/editor/editor-game/useGameLayer.ts'
import { useBoundingBox } from '@/features/editor/editor-shapes/hooks/useBoundingBox.ts'
import { useShapeClipboard } from '@/features/editor/editor-shapes/hooks/useShapeClipboard.ts'
import { useShapeCore } from '@/features/editor/editor-shapes/hooks/useShapeCore.ts'
import type { ShapeDrafts } from '@/features/editor/editor-shapes/hooks/useShapeDraft.ts'
import { useShapeRadialMenu } from '@/features/editor/editor-shapes/hooks/useShapeRadialMenu.ts'
import { useShapeSelection } from '@/features/editor/editor-shapes/hooks/useShapeSelection.ts'
import { useToolManager } from '@/features/editor/editor-ui/hooks/useToolManager.ts'
import { useRemoteCursors } from '@/features/editor/edtitor-sync/useRemoteCursors.ts'
import { useRemoteSelection } from '@/features/editor/edtitor-sync/useRemoteSelection.ts'
import { ShapeType } from '@/features/editor/types/shape.types.ts'
import { ToolName } from '@/features/editor/types/tool.types.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'
import { throttle } from '@/shared/utils/throttle.ts'

export function useInputEvents(deps: {
	containerRef: Ref<HTMLElement | null>
	toolManager: ReturnType<typeof useToolManager>
	shapeCore: ReturnType<typeof useShapeCore>
	pointer3DTools: ReturnType<typeof usePointer3DTools>
	boundingBox: ReturnType<typeof useBoundingBox>
	selection: ReturnType<typeof useShapeSelection>
	pan: ReturnType<typeof usePan3D>
	remoteCursors: ReturnType<typeof useRemoteCursors>
	remoteSelection: ReturnType<typeof useRemoteSelection>
	shapeClipboard: ReturnType<typeof useShapeClipboard>
	zoom: ReturnType<typeof useZoom3D>
	menu: ReturnType<typeof useShapeRadialMenu>
	isSpacePressed: Ref<boolean>
	requestDraw: Ref<() => void>
	updateSelectedTool: (event: 'update:selectedTool', value: ToolName) => void
	drafts?: ShapeDrafts
	lockedShapeIDs: Ref<Set<string>>
	gameLayer: ReturnType<typeof useGameLayer>
}) {
	const throttledPointerMove = throttle(handlePointerMove, 16)

	useEventListener(window, 'pointerup', handlePointerUp)
	useEventListener(deps.containerRef, 'pointermove', throttledPointerMove)
	useEventListener(deps.containerRef, 'pointerdown', handlePointerDown)

	function createShapeAndRestoreDefaultTool(type: ShapeType, worldPos: PositionXY) {
		deps.shapeCore.createShape({ x1: worldPos.x, y1: worldPos.y, type })
		deps.updateSelectedTool('update:selectedTool', ToolName.SELECT)
	}

	function handlePointerMove($event: MouseEvent) {
		if (!deps.containerRef.value) return

		const pos = { x: $event.clientX, y: $event.clientY }
		if (deps.pan.updatePan(pos)) {
			deps.requestDraw.value()
			return
		}

		deps.pointer3DTools.setPointerNDC(pos)
		const worldPos = deps.pointer3DTools.screenToWorld(pos)

		if (deps.drafts) {
			Object.values(deps.drafts)?.forEach((d) => {
				if (d.isActive()) {
					d.update(worldPos)
					deps.requestDraw.value()
				}
			})
		}

		if (deps.toolManager.selectedTool.value === ToolName.SELECT) {
			deps.boundingBox.handleMouseMove(worldPos)
			deps.selection.handleMouseMove(worldPos)
		}

		deps.remoteCursors.updateCursor(worldPos)

		deps.requestDraw.value()
		if (deps.boundingBox.isActive.value) {
			setTimeout(() => {
				deps.requestDraw.value()
			}, 0)
		}
	}

	function handlePointerDown($event: MouseEvent) {
		const pos = { x: $event.clientX, y: $event.clientY }
		deps.pointer3DTools.setPointerNDC(pos)
		const worldPos = deps.pointer3DTools.screenToWorld(pos)

		const isLeftButton = $event.button === 0
		const isMiddleButton = $event.button === 1
		if (isMiddleButton || deps.isSpacePressed.value) {
			deps.pan.startPan(pos)
			return
		}
		if (!isLeftButton) return

		if (deps.toolManager.selectedTool.value === ToolName.HAND) {
			deps.pan.startPan(pos)
			return
		}

		switch (deps.toolManager.selectedTool.value) {
			case ToolName.SELECT: {
				const shape = deps.shapeCore.findShapeAtPos3D(worldPos)
				const isLocked = shape && deps.lockedShapeIDs.value.has(shape.id)
				if (isLocked) return

				const isInsideBox = deps.boundingBox.isPointInBoundingBox(worldPos)

				if (isInsideBox && deps.gameLayer.tryGameInteraction(shape)) return

				if (shape) {
					deps.selection.handleClick(shape.id, $event)
				} else if (!isInsideBox) {
					deps.selection.handleMouseDown(worldPos)
				}

				void nextTick(() => {
					deps.boundingBox.handleMouseDown(worldPos, deps.lockedShapeIDs)
				})

				break
			}
			case ToolName.RECT: {
				createShapeAndRestoreDefaultTool(ShapeType.RECT, worldPos)
				break
			}
			case ToolName.ELLIPSE: {
				createShapeAndRestoreDefaultTool(ShapeType.ELLIPSE, worldPos)
				break
			}
			case ToolName.LINE: {
				if (deps.drafts?.line) deps.drafts.line.start(worldPos, ShapeType.LINE)
				break
			}
			case ToolName.ARROW: {
				if (deps.drafts?.line) deps.drafts.line.start(worldPos, ShapeType.ARROW)
				break
			}
			case ToolName.PENCIL: {
				if (deps.drafts?.pencil) deps.drafts.pencil.start(worldPos)
				break
			}
			case ToolName.ERASER: {
				if (deps.drafts?.eraser) deps.drafts.eraser.start(worldPos)
				break
			}
		}

		deps.requestDraw.value()
	}

	function handlePointerUp() {
		if (deps.pan.isPanning.value) {
			deps.pan.endPan()
			return
		}

		if (deps.drafts?.line?.isActive()) {
			deps.drafts.line.commit()
			deps.updateSelectedTool('update:selectedTool', ToolName.SELECT)
		}
		if (deps.drafts?.pencil?.isActive()) {
			deps.drafts.pencil.commit()
		}
		if (deps.drafts?.eraser?.isActive()) {
			deps.drafts.eraser.commit()
		}

		deps.boundingBox.handleMouseUp()
		deps.selection.handleMouseUp()

		deps.requestDraw.value()
	}

	useEventListener(window, 'keydown', handleKeydown)
	useEventListener(window, 'wheel', handleWheel, { passive: false })
	const mouse = useMouse()
	function handleKeydown($event: KeyboardEvent) {
		const isMac = navigator.userAgent.includes('Mac')
		const ctrl = isMac ? $event.metaKey : $event.ctrlKey

		if ($event.key === 'Delete' || $event.key === 'Backspace') {
			deps.shapeCore.removeByIDs(deps.selection.selectedShapeIDs.value)
			deps.selection.clear()
			deps.menu.close()
		}
		if (ctrl && $event.code === 'KeyC') deps.shapeClipboard.copy(deps.selection.selectedShapeIDs.value)
		if (ctrl && $event.code === 'KeyV') {
			deps.selection.selectedShapeIDs.value = deps.shapeClipboard.paste(
				deps.pointer3DTools.screenToWorld({
					x: mouse.x.value,
					y: mouse.y.value,
				} as MouseEvent),
			)
		}
		if ($event.key === '=' || $event.key === '+') deps.zoom.zoomIn()
		if ($event.key === '-') deps.zoom.zoomOut()

		if ($event.key === 'Escape') {
			if (deps.drafts) {
				Object.values(deps.drafts).forEach((draft) => {
					if (draft.isActive()) draft.clear()
				})
			}
			if (deps.boundingBox.isActive.value) deps.boundingBox.handleEscape()
			deps.selection.reset()
		}
	}
	function handleWheel($event: WheelEvent) {
		if ($event.ctrlKey) {
			deps.pan.panVertical($event.deltaY < 0 ? 'up' : 'down')
		} else if ($event.shiftKey) {
			deps.pan.panHorizontal($event.deltaY < 0 ? 'left' : 'right')
		} else {
			deps.zoom.handleWheel3D($event)
		}
		$event.preventDefault()
	}

	return {
		handlePointerMove,
		handlePointerDown,
		handlePointerUp,
		handleKeydown,
		handleWheel,
	}
}
