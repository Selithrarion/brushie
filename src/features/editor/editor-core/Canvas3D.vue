<template>
	<div ref="containerRef" class="absolute inset-0" @contextmenu.prevent="shapeMenu.onContextMenu">
		<canvas ref="webglCanvasRef" class="absolute inset-0" />
		<canvas ref="overlayRef" class="pointer-events-none absolute inset-0"></canvas>

		<!--<CanvasDebug3D v-if="scene && renderer" :renderer="renderer" :scene="scene" />-->
		<ShapeRadialMenu
			:angle-offset="shapeMenu.angleOffset.value"
			:centered="shapeMenu.centered.value"
			:items="shapeMenu.items.value"
			:onClose="shapeMenu.close"
			:stack-length="shapeMenu.stackLength.value"
			:visible="shapeMenu.openedMenu.value === 'shape'"
			:x="shapeMenu.x.value || 0"
			:y="shapeMenu.y.value || 0"
		/>
	</div>
</template>

<script setup lang="ts">
import { useRafFn } from '@vueuse/core'
import * as THREE from 'three'
import { onMounted, ref, useTemplateRef, watch } from 'vue'

// import CanvasDebug3D from '@/features/render/CanvasDebug3D.vue'
import { useCanvasBackground } from '@/features/editor/editor-core/hooks/useCanvasBackground.ts'
import { useGridDots } from '@/features/editor/editor-core/hooks/useGridDots.ts'
import { useMeshesManager } from '@/features/editor/editor-core/hooks/useMeshesManager.ts'
import { useMeshHighlight } from '@/features/editor/editor-core/hooks/useMeshHighlight.ts'
import { useOverlayCanvas } from '@/features/editor/editor-core/hooks/useOverlayCanvas.ts'
import { usePan3D } from '@/features/editor/editor-core/hooks/usePan3D.ts'
import { useParticleSystem } from '@/features/editor/editor-core/hooks/useParticleSystem.ts'
import { usePointer3DTools } from '@/features/editor/editor-core/hooks/usePointer3DTools.ts'
import { usePostProcessing } from '@/features/editor/editor-core/hooks/usePostProcessing.ts'
import { useResizeHandler } from '@/features/editor/editor-core/hooks/useResizeHandler.ts'
import { useWebGlRenderer } from '@/features/editor/editor-core/hooks/useWebGlRenderer.ts'
import { useZoom3D } from '@/features/editor/editor-core/hooks/useZoom3D.ts'
import { useGameLayer } from '@/features/editor/editor-game/useGameLayer.ts'
import { useInputEvents } from '@/features/editor/editor-input/useInputEvents.ts'
import { usePointerCursor } from '@/features/editor/editor-input/usePointerCursor.ts'
import { useBoundingBox } from '@/features/editor/editor-shapes/hooks/useBoundingBox.ts'
import { useEraserDraft } from '@/features/editor/editor-shapes/hooks/useEraserDraft.ts'
import { useLineDraft } from '@/features/editor/editor-shapes/hooks/useLineDraft.ts'
import { usePencilDraft } from '@/features/editor/editor-shapes/hooks/usePencilDraft.ts'
import { useShapeClipboard } from '@/features/editor/editor-shapes/hooks/useShapeClipboard.ts'
import { useShapeCore } from '@/features/editor/editor-shapes/hooks/useShapeCore.ts'
import type { ShapeDrafts } from '@/features/editor/editor-shapes/hooks/useShapeDraft.ts'
import { useShapeRadialMenu } from '@/features/editor/editor-shapes/hooks/useShapeRadialMenu.ts'
import { useShapeSelection } from '@/features/editor/editor-shapes/hooks/useShapeSelection.ts'
import ShapeRadialMenu from '@/features/editor/editor-shapes/ShapeRadialMenu.vue'
import { useInertiaUI } from '@/features/editor/editor-ui/hooks/useInertialUI.ts'
import { useToolManager } from '@/features/editor/editor-ui/hooks/useToolManager.ts'
import type { TShapeDraft } from '@/features/editor/edtitor-sync/types/draft.types.ts'
import { useLockedShapes } from '@/features/editor/edtitor-sync/useLockedShapes.ts'
import { useRemoteCursors } from '@/features/editor/edtitor-sync/useRemoteCursors.ts'
import { useRemoteSelection } from '@/features/editor/edtitor-sync/useRemoteSelection.ts'
import { useSyncDraftShapes } from '@/features/editor/edtitor-sync/useSyncDraftShapes.ts'
import { useUndoRedo } from '@/features/editor/edtitor-sync/useUndoRedo.ts'
import { useYjs } from '@/features/editor/edtitor-sync/useYjs.ts'
import { type PencilShape, type Shape, type StrokeShape } from '@/features/editor/types/shape.types.ts'
import { ToolName } from '@/features/editor/types/tool.types.ts'
import { useSpacePressed } from '@/shared/hooks/useSpacePressed.ts'

const { toolManager } = defineProps<{
	toolManager: ReturnType<typeof useToolManager>
}>()

const emit = defineEmits<{
	(e: 'update:selectedTool', value: ToolName): void
}>()

const meshes = new Map<string, THREE.Object3D>()

const requestDraw = ref<() => void>(() => {})

const containerRef = useTemplateRef('containerRef')
const overlayRef = useTemplateRef('overlayRef')
const webglCanvasRef = useTemplateRef('webglCanvasRef')

const { renderer, scene, camera } = useWebGlRenderer(webglCanvasRef)

const particleSystem = useParticleSystem(scene)

const { composer, renderFrame } = usePostProcessing({
	renderer,
	scene,
	camera,
	containerRef,
})

const { provider, localClientID, currentRoomID } = useYjs()
const syncDraftShapes = useSyncDraftShapes<TShapeDraft<StrokeShape> | TShapeDraft<PencilShape>>()

const pointer3DTools = usePointer3DTools(containerRef, camera)
const shapeCore = useShapeCore(meshes, renderer, camera, pointer3DTools)
const shapeClipboard = useShapeClipboard(shapeCore.shapes, shapeCore.createShape)

const { lockedShapeIDs } = useLockedShapes(provider)
const selection = useShapeSelection(shapeCore.shapes, lockedShapeIDs)
const boundingBox = useBoundingBox(shapeCore, selection, pointer3DTools)
const remoteSelection = useRemoteSelection(provider, selection, boundingBox)
const remoteCursors = useRemoteCursors(provider)

const shapeMenu = useShapeRadialMenu({ renderer, meshes, shapeCore, pointer3DTools, lockedShapeIDs })

const zoom = useZoom3D(containerRef, camera, pointer3DTools, shapeMenu, currentRoomID, requestDraw)
const pan = usePan3D(zoom, containerRef, requestDraw)
const { isSpacePressed } = useSpacePressed()

useCanvasBackground({ containerRef, scene, camera, zoom })

const overlay = useOverlayCanvas(
	overlayRef,
	containerRef,
	camera,
	pointer3DTools,
	shapeCore,
	remoteCursors,
	selection,
	boundingBox,
	remoteSelection,
	zoom,
	provider,
)

const meshesManager = useMeshesManager(
	containerRef,
	renderer,
	scene,
	boundingBox,
	selection,
	remoteSelection,
	requestDraw,
	meshes,
	lockedShapeIDs,
)
useMeshHighlight({
	selection,
	boundingBox,
	meshes,
	requestDraw,
})

const lineDraft = useLineDraft(shapeCore.createShape)
const pencilDraft = usePencilDraft(shapeCore.createShape)
const eraserDraft = useEraserDraft({ shapeCore, meshes, meshesManager })
const drafts: ShapeDrafts = { line: lineDraft, pencil: pencilDraft, eraser: eraserDraft }

const gameLayer = useGameLayer({
	particleSystem,
	shapeCore,
	meshes,
	selection,
})
useInputEvents({
	containerRef,
	toolManager,
	shapeCore,
	pointer3DTools,
	boundingBox,
	selection,
	pan,
	remoteCursors,
	remoteSelection,
	shapeClipboard,
	zoom,
	menu: shapeMenu,
	isSpacePressed,
	updateSelectedTool: emit,
	requestDraw,
	drafts,
	lockedShapeIDs,
	gameLayer,
})

usePointerCursor(containerRef, boundingBox, pan, toolManager, remoteSelection, lockedShapeIDs, isSpacePressed)

useUndoRedo(shapeCore.undo, shapeCore.redo, { drafts, requestDraw })

useGridDots(scene, zoom)

useInertiaUI(zoom)

useResizeHandler({
	renderer,
	camera,
	containerRef,
	zoom,
	requestDraw,
	composer,
})

// NOTE: decided not to use render-on-demand even after adding all needed requestDraw calls
// dont remember why but maybe it was tough to watch all of them or there were some rendering bugs
useRafFn(({ delta }) => {
	draw(delta * 0.001)
})
requestDraw.value = () => {
	// overlay.requestDraw()
	// draw()
}
function draw(delta: number) {
	if (!scene.value || !camera.value || !composer.value) return
	particleSystem.update(delta)
	renderFrame(delta)
	overlay.drawOverlay()
}

onMounted(() => {
	const ambientLight = new THREE.AmbientLight(0xffffff, 3.5)
	scene.value!.add(ambientLight)
})

defineExpose({
	zoom,
	draw,
	canvasRef: containerRef,
})

let previousIDs = new Set<string>()
watch(lockedShapeIDs, (currentIDs) => {
	const added = [...currentIDs].filter((id) => !previousIDs.has(id))
	const removed = [...previousIDs].filter((id) => !currentIDs.has(id))

	if (added.length === 0 && removed.length === 0) return

	for (const id of added) {
		const mesh = meshes.get(id)
		if (mesh) meshesManager.updateLocked(id, mesh)
	}
	for (const id of removed) {
		const mesh = meshes.get(id)
		if (mesh) meshesManager.updateLocked(id, mesh)
	}

	previousIDs = new Set(currentIDs)
})

watch(
	remoteSelection.remoteBoxes,
	(value) => {
		const currentActiveIDs = new Set<string>()

		Object.values(value).forEach((box) => {
			for (const id of box.shapeIDs) {
				currentActiveIDs.add(id)
			}
		})

		for (const id of currentActiveIDs) {
			const shape = shapeCore.shapeMap.get(id)
			if (shape) meshesManager.update(shape)
		}

		requestDraw.value()
	},
	{ deep: true },
)

Object.values(drafts).forEach((d) => {
	watch(d.shape, () => syncDraft(d.shape.value as TShapeDraft<Shape> | null), {
		deep: true,
	})
})
watch(
	syncDraftShapes.drafts,
	(allDrafts) => {
		allDrafts
			.filter((d) => d.authorID !== localClientID)
			.forEach((foreign) => {
				syncDraft(foreign)
			})
	},
	{ deep: true },
)

function syncDraft(draft: TShapeDraft<Shape> | null) {
	for (const [id, mesh] of meshes.entries()) {
		if (id.startsWith('draft-') && !syncDraftShapes.drafts.value.some((d) => d.id === id)) {
			meshesManager.remove(id, mesh)
		}
	}
	if (draft) {
		if (!meshes.has(draft.id)) meshesManager.create(draft)
		meshesManager.update(draft)
	}
}

watch(shapeCore.shapes, syncAddRemove, { deep: true })
watch(meshesManager.brushTexture, (newValue, oldValue) => {
	if (!oldValue && newValue) syncAddRemove()
})
function syncAddRemove() {
	if (!meshesManager.brushTexture.value) return

	const currentIDs = new Set(shapeCore.shapes.value.map((s) => s.id))
	for (const [id, mesh] of meshes.entries()) {
		if (!currentIDs.has(id)) meshesManager.removeShapeWithAnimation(id, mesh)
	}
	for (const shape of shapeCore.shapes.value) {
		if (!meshes.has(shape.id)) meshesManager.create(shape)
	}
}

watch(
	boundingBox.rawBox,
	() => {
		const ids = selection.selectedShapeIDs.value
		if (!ids || !ids.length) return
		ids.forEach((id) => {
			const shape = shapeCore.shapeMap.get(id)
			if (shape) meshesManager.update(shape)
		})
	},
	{ deep: true },
)

watch(toolManager.selectedTool, () => {
	Object.values(drafts).forEach((d) => {
		if (d.isActive()) d.clear()
	})
})
</script>
