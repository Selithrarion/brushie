import { useMouse } from '@vueuse/core'
import * as THREE from 'three'
import { nextTick, onBeforeUnmount, onMounted, type Ref, type ShallowRef } from 'vue'

import { useBoundingBox } from '@/features/render/hooks/useBoundingBox.ts'
import { useLineDraft } from '@/features/render/hooks/useLineDraft.ts'
import { usePan3D } from '@/features/render/hooks/usePan3D.ts'
import { usePencilDraft } from '@/features/render/hooks/usePencilDraft.ts'
import { usePointer3DTools } from '@/features/render/hooks/usePointer3DTools.ts'
import { useShapeClipboard } from '@/features/render/hooks/useShapeClipboard.ts'
import { useShapeCore } from '@/features/render/hooks/useShapeCore.ts'
import { useShapeSelection } from '@/features/render/hooks/useShapeSelection.ts'
import { useToolManager } from '@/features/render/hooks/useToolManager.ts'
import { useZoom3D } from '@/features/render/hooks/useZoom3D.ts'
import { ShapeType } from '@/features/render/types/Shape.ts'
import { ToolName } from '@/features/render/types/Tool.ts'
import { useRemoteCursors } from '@/features/sync/useRemoteCursors.ts'
import { useRemoteSelection } from '@/features/sync/useRemoteSelection.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'
import type { useContextMenu } from '@/shared/ui/menu/useContextMenu.ts'
import { throttle } from '@/shared/utils/throttle.ts'

export function useInputEvents(params: {
	containerRef: Ref<HTMLElement | undefined>
	renderer: ShallowRef<THREE.WebGLRenderer | null>
	camera: Ref<THREE.OrthographicCamera | null>
	toolManager: ReturnType<typeof useToolManager>
	shapeCore: ReturnType<typeof useShapeCore>
	pointer3DTools: ReturnType<typeof usePointer3DTools>
	boundingBox: ReturnType<typeof useBoundingBox>
	selection: ReturnType<typeof useShapeSelection>
	pan: ReturnType<typeof usePan3D>
	lineDraft: ReturnType<typeof useLineDraft>
	pencilDraft: ReturnType<typeof usePencilDraft>
	remoteCursors: ReturnType<typeof useRemoteCursors>
	remoteSelection: ReturnType<typeof useRemoteSelection>
	shapeClipboard: ReturnType<typeof useShapeClipboard>
	zoom: ReturnType<typeof useZoom3D>
	menu: ReturnType<typeof useContextMenu>
	isSpacePressed: Ref<boolean>
	requestDraw: Ref<() => void>
	updateSelectedTool: (event: 'update:selectedTool', value: ToolName) => void
}) {
	const throttledPointerMove = throttle(onPointerMove, 16)

	const handlers: Record<string, ($event: MouseEvent) => void> = {
		pointermove: throttledPointerMove,
		pointerdown: onPointerDown,
		pointerup: onPointerUp,
	}
	onMounted(() => {
		handleWindowResize()
		window.addEventListener('resize', handleWindowResize)
		window.addEventListener('mouseup', handleGlobalMouseUp)

		if (params.containerRef.value) {
			for (const eventName in handlers) {
				params.containerRef.value.addEventListener(eventName, handlers[eventName] as EventListener)
			}
		}
	})
	onBeforeUnmount(() => {
		window.removeEventListener('resize', handleWindowResize)
		window.removeEventListener('mouseup', handleGlobalMouseUp)

		if (params.renderer.value) {
			params.renderer.value.domElement.removeEventListener('pointermove', onPointerMove)
			params.renderer.value.domElement.removeEventListener('pointerdown', onPointerDown)
			params.renderer.value.domElement.removeEventListener('pointerup', onPointerUp)
			params.renderer.value.dispose()
		}

		if (params.containerRef.value) {
			for (const eventName in handlers) {
				params.containerRef.value.removeEventListener(eventName, handlers[eventName] as EventListener)
			}
		}
	})

	function createShapeAndRestoreDefaultTool(type: ShapeType, worldPos: PositionXY) {
		params.shapeCore.createShape({ x1: worldPos.x, y1: worldPos.y, type })
		params.updateSelectedTool('update:selectedTool', ToolName.SELECT)
	}

	function handleWindowResize() {
		if (!params.renderer.value || !params.camera.value || !params.containerRef.value) return

		const w = params.containerRef.value.clientWidth
		const h = params.containerRef.value.clientHeight

		params.renderer.value.setSize(w, h, false)
		params.zoom.updateCameraFromZoom()
		params.requestDraw.value()
	}

	function onPointerMove($event: MouseEvent) {
		if (!params.renderer.value || !params.camera.value) return

		if (params.menu.visible.value) return

		if (params.pan.updatePan({ x: $event.clientX, y: $event.clientY })) {
			params.requestDraw.value()
			return
		}

		params.pointer3DTools.setPointerNDC($event)
		const worldPos = params.pointer3DTools.screenToWorld($event)

		if (params.lineDraft.shape.value) {
			params.lineDraft.update(worldPos)
			params.requestDraw.value()
			return
		}

		if (params.pencilDraft.shape.value) {
			params.pencilDraft.update(worldPos)
			params.requestDraw.value()
			return
		}

		if (params.toolManager.selectedTool.value === ToolName.SELECT) {
			params.boundingBox.handleMouseMove(worldPos)
			params.selection.handleMouseMove(worldPos)
		}

		params.remoteCursors.updateCursor(worldPos)

		params.requestDraw.value()
	}

	function onPointerDown($event: MouseEvent) {
		if (params.menu.visible.value) return

		params.pointer3DTools.setPointerNDC($event)
		const worldPos = params.pointer3DTools.screenToWorld($event)

		const isLeftButton = $event.button === 0
		const isMiddleButton = $event.button === 1
		if (isMiddleButton || params.isSpacePressed.value) {
			params.pan.startPan({ x: $event.clientX, y: $event.clientY })
			return
		}
		if (!isLeftButton) return

		if (params.toolManager.selectedTool.value === ToolName.HAND) {
			params.pan.startPan({ x: $event.clientX, y: $event.clientY })
			return
		}

		switch (params.toolManager.selectedTool.value) {
			case ToolName.SELECT: {
				const shape = params.shapeCore.findShapeAtPos3D(worldPos)
				const isLocked = shape && params.remoteSelection.lockedShapeIDs.value.has(shape.id)
				if (isLocked) return

				const isInsideBox = params.boundingBox.isPointInBoundingBox(worldPos)

				// 1. shape click && bb is not active
				// 2. shape click && bb is active
				// 3. not shape click && not bb click
				// 4. not shape click && bb click
				if (shape && !params.boundingBox.isActive.value) params.selection.handleClick(shape.id, $event)
				if (shape && params.boundingBox.isActive.value) {
					const selectedIDs = params.selection.selectedShapeIDs.value
					if (!selectedIDs.includes(shape.id) || !isInsideBox) {
						params.selection.handleClick(shape.id, $event)
					}
				}
				if (!shape && !isInsideBox) {
					params.selection.handleMouseDown(worldPos)
				}
				nextTick(() => {
					params.boundingBox.handleMouseDown(worldPos, params.remoteSelection.lockedShapeIDs)
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
				params.lineDraft.start(worldPos, ShapeType.LINE)
				break
			}
			case ToolName.ARROW: {
				params.lineDraft.start(worldPos, ShapeType.ARROW)
				break
			}
			case ToolName.PENCIL: {
				params.pencilDraft.start(worldPos)
				break
			}
			case ToolName.DELETE: {
				const shape = params.shapeCore.findShapeAtPos3D(worldPos)
				if (shape && !params.remoteSelection.lockedShapeIDs.value.has(shape.id)) {
					params.shapeCore.deleteShape(shape.id)
				}
				break
			}
		}

		params.requestDraw.value()
	}

	function onPointerUp() {
		if (params.pan.isPanning.value) {
			params.pan.endPan()
			return
		}

		if (params.lineDraft.shape.value) {
			params.lineDraft.commit()
			params.updateSelectedTool('update:selectedTool', ToolName.SELECT)
		}

		if (params.pencilDraft.shape.value) {
			params.pencilDraft.commit()
		}

		params.boundingBox.handleMouseUp()
		params.selection.handleMouseUp()

		if (params.toolManager.selectedTool.value === ToolName.SELECT) {
			params.shapeCore.handleMouseUp()
		}

		params.requestDraw.value()
	}

	function handleGlobalMouseUp() {
		if (params.toolManager.selectedTool.value === ToolName.SELECT) {
			params.shapeCore.handleMouseUp()
			params.boundingBox.handleMouseUp()
			params.selection.handleMouseUp()
			params.pan.endPan()
			params.requestDraw.value()
		}
	}

	function onContextMenu($event: MouseEvent) {
		if (!params.renderer.value) return

		params.pointer3DTools.setPointerNDC($event)
		const worldPos = params.pointer3DTools.screenToWorld($event)

		const shape = params.shapeCore.findShapeAtPos3D(worldPos)
		const isLocked = shape && params.remoteSelection.lockedShapeIDs.value.has(shape.id)
		if (isLocked) return

		if (shape) {
			params.menu.openAtPosition($event.clientX, $event.clientY, [
				{ label: 'Delete', action: () => params.shapeCore.deleteShape(shape.id) },
			])
		} else {
			params.menu.openAtPosition($event.clientX, $event.clientY, [
				{
					label: 'Create rect',
					action: () => createShapeAndRestoreDefaultTool(ShapeType.RECT, worldPos),
				},
				{
					label: 'Create ellipse',
					action: () => createShapeAndRestoreDefaultTool(ShapeType.ELLIPSE, worldPos),
				},
				{
					label: 'Create line',
					action: () => createShapeAndRestoreDefaultTool(ShapeType.LINE, worldPos),
				},
				{
					label: 'Create arrow',
					action: () => createShapeAndRestoreDefaultTool(ShapeType.ARROW, worldPos),
				},
			])
		}
	}

	const mouse = useMouse()
	function handleKeydown($event: KeyboardEvent) {
		const isMac = navigator.userAgent.includes('Mac')
		const ctrl = isMac ? $event.metaKey : $event.ctrlKey

		if ($event.key === 'Delete' || $event.key === 'Backspace') {
			params.shapeCore.deleteByIDs(params.selection.selectedShapeIDs.value)
			params.selection.clear()
		}
		if (ctrl && $event.code === 'KeyC') params.shapeClipboard.copy(params.selection.selectedShapeIDs.value)
		if (ctrl && $event.code === 'KeyV') {
			params.selection.selectedShapeIDs.value = params.shapeClipboard.paste(
				params.pointer3DTools.screenToWorld({
					clientX: mouse.x.value,
					clientY: mouse.y.value,
				} as MouseEvent),
			)
		}
		if ($event.key === '=' || $event.key === '+') params.zoom.zoomIn()
		if ($event.key === '-') params.zoom.zoomOut()

		if ($event.key === 'Escape') {
			if (params.lineDraft.shape.value) params.lineDraft.clear()
			if (params.pencilDraft.shape.value) params.pencilDraft.clear()
			if (params.boundingBox.isActive.value) params.boundingBox.handleEscape()
		}
	}
	function handleWheel($event: WheelEvent) {
		if ($event.ctrlKey) {
			params.zoom.handleWheel3D($event)
		} else if ($event.shiftKey) {
			params.pan.panHorizontal($event.deltaY < 0 ? 'left' : 'right')
		} else {
			params.pan.panVertical($event.deltaY < 0 ? 'up' : 'down')
		}
	}
	onMounted(() => {
		window.addEventListener('keydown', handleKeydown)
		window.addEventListener('wheel', handleWheel, { passive: false })
	})
	onBeforeUnmount(() => {
		window.removeEventListener('keydown', handleKeydown)
		window.removeEventListener('wheel', handleWheel)
	})

	return {
		onPointerMove,
		onPointerDown,
		onPointerUp,
		handleGlobalMouseUp,
		handleWindowResize,
		handleKeydown,
		handleWheel,
		onContextMenu,
	}
}
