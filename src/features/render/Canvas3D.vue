<template>
	<div ref="containerRef" class="absolute inset-0" @contextmenu.prevent="inputEvents.onContextMenu">
		<canvas ref="webglCanvasRef" class="absolute inset-0" />
		<canvas ref="overlayRef" class="pointer-events-none absolute inset-0"></canvas>
		<CanvasDebug3D v-if="scene && renderer" :renderer="renderer" :scene="scene" />
	</div>
</template>

<!--TODO:
ux:
useBoundingBox - ?snap ?animations
useShapeClipboard - ?paste preview ?animate

sync - !offline, !recheck locked logic, !check conflicts, !sync drafts

locked shapes ???

create rect by holding mouse + animations

bug - fix bounding box overlay + rotate
bug - undo/redo moved shape

1. instanced mesh
2. render on demand
3. (do i need it ?) composer effects
4. excalidraw drawing
5. excelidraw erasing

not important:
shape z-index
shape customization
сделать выделение краев фигуры (threejs)
useShapeSelection - ?lasso selection
useToolManager - ?custom tools
useOverlayCanvas - ?multitouch
useZoom - ?sync zoom like figma
usePencilDraft - ?pressure ?find better throttling ?color ?lineWidth

add some 3d feats?

recheck later:
dirty only update

use https://shihn.ca/posts/2020/resizing-rotated-elements/ for resize rotated
-->

<script setup lang="ts">
import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import CanvasDebug3D from '@/features/CanvasDebug3D.vue'
import { useBoundingBox } from '@/features/render/hooks/useBoundingBox.ts'
import { useInputEvents } from '@/features/render/hooks/useInputEvents.ts'
import { useLineDraft } from '@/features/render/hooks/useLineDraft.ts'
import { useOverlayCanvas } from '@/features/render/hooks/useOverlayCanvas.ts'
import { usePan3D } from '@/features/render/hooks/usePan3D.ts'
import { usePencilDraft } from '@/features/render/hooks/usePencilDraft.ts'
import { usePointer3DTools } from '@/features/render/hooks/usePointer3DTools.ts'
import { usePointerCursor } from '@/features/render/hooks/usePointerCursor.ts'
import { useShapeClipboard } from '@/features/render/hooks/useShapeClipboard.ts'
import { useShapeCore } from '@/features/render/hooks/useShapeCore.ts'
import { useShapeSelection } from '@/features/render/hooks/useShapeSelection.ts'
import { useSpacePressed } from '@/features/render/hooks/useSpacePressed.ts'
import { useToolManager } from '@/features/render/hooks/useToolManager.ts'
import { useZoom3D } from '@/features/render/hooks/useZoom3D.ts'
import { type Shape, ShapeType } from '@/features/render/types/Shape.ts'
import { ToolName } from '@/features/render/types/Tool.ts'
import { useRemoteCursors } from '@/features/sync/useRemoteCursors.ts'
import { useRemoteSelection } from '@/features/sync/useRemoteSelection.ts'
import { useUndoRedo } from '@/features/sync/useUndoRedo.ts'
import { useYShapes } from '@/features/sync/useYShapes.ts'
import { useWebGlRenderer } from '@/features/useWebGlRenderer.ts'
import { useContextMenu } from '@/shared/ui/menu/useContextMenu.ts'

const { toolManager, menu } = defineProps<{
	toolManager: ReturnType<typeof useToolManager>
	menu: ReturnType<typeof useContextMenu>
}>()

const emit = defineEmits<{
	(e: 'update:selectedTool', value: ToolName): void
}>()

const requestDraw = ref<() => void>(() => {})

const containerRef = ref<HTMLDivElement>()
const overlayRef = ref<HTMLCanvasElement>()
const webglCanvasRef = ref<HTMLCanvasElement>()

const { renderer, scene, camera } = useWebGlRenderer(webglCanvasRef)
const meshes = new Map<string, THREE.Mesh>()

const { provider, shapes, roomID, undo, redo } = useYShapes()
const pointer3DTools = usePointer3DTools(containerRef, camera)
const shapeCore = useShapeCore(meshes, renderer, camera, pointer3DTools)
const zoom = useZoom3D(containerRef, camera, pointer3DTools, roomID, requestDraw)
const pan = usePan3D(zoom, containerRef, requestDraw)
const { isSpacePressed } = useSpacePressed()

const remoteCursors = useRemoteCursors(provider)

const selection = useShapeSelection(shapes)
const boundingBox = useBoundingBox(shapeCore, selection, pointer3DTools)
const remoteSelection = useRemoteSelection(provider, selection, boundingBox)

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
	provider,
)

const lineDraft = useLineDraft(shapeCore.createShape)
const pencilDraft = usePencilDraft(shapeCore.createShape)

const shapeClipboard = useShapeClipboard(shapes, shapeCore.createShape)

const inputEvents = useInputEvents({
	containerRef,
	renderer,
	camera,
	toolManager,
	shapeCore,
	pointer3DTools,
	boundingBox,
	selection,
	pan,
	lineDraft,
	pencilDraft,
	remoteCursors,
	remoteSelection,
	shapeClipboard,
	zoom,
	menu,
	isSpacePressed,
	updateSelectedTool: emit,
	requestDraw,
})
usePointerCursor(containerRef, boundingBox, pan, toolManager, isSpacePressed)

useUndoRedo(undo, redo, { pencilDraft, lineDraft, requestDraw })

requestDraw.value = () => {
	overlay.requestDraw()
	draw()
}
function draw() {
	if (!renderer.value || !scene.value || !camera.value) return
	renderer.value.render(scene.value, camera.value)
}
let animationFrameID: number | null = null
function renderLoop() {
	animationFrameID = requestAnimationFrame(() => {
		draw()
		// overlay.drawOverlay()
		renderLoop()
	})
}
function startRenderLoop() {
	if (animationFrameID === null) {
		renderLoop()
	}
}
function stopRenderLoop() {
	if (animationFrameID !== null) {
		cancelAnimationFrame(animationFrameID)
		animationFrameID = null
	}
}
onMounted(() => {
	startRenderLoop()
	syncAddRemove()
})
onBeforeUnmount(() => {
	stopRenderLoop()
})

defineExpose({
	zoom,
	draw,
	canvasRef: containerRef,
})

function disposeMaterials(mesh: THREE.Mesh | THREE.Line | THREE.Points) {
	if (Array.isArray(mesh.material)) {
		mesh.material.forEach((m) => m.dispose())
	} else {
		mesh.material.dispose()
	}
}
// ==============

let composer: EffectComposer
let outlinePass: OutlinePass
onMounted(() => {
	composer = new EffectComposer(renderer.value)

	const renderPass = new RenderPass(scene.value, camera.value)
	composer.addPass(renderPass)

	outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene.value, camera.value)
	composer.addPass(outlinePass)
})

let previousIDs = new Set<string>()
watch(remoteSelection.lockedShapeIDs, (currentIDs) => {
	const added = [...currentIDs].filter((id) => !previousIDs.has(id))
	const removed = [...previousIDs].filter((id) => !currentIDs.has(id))

	if (added.length === 0 && removed.length === 0) return

	for (const id of added) {
		const mesh = meshes.get(id)
		if (mesh) mesh.userData.isLocked = true
	}
	for (const id of removed) {
		const mesh = meshes.get(id)
		if (mesh) mesh.userData.isLocked = false
	}

	previousIDs = new Set(currentIDs)

	// overlay.requestDraw()
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
			const mesh = meshes.get(id)
			if (mesh) updateMeshAppearance(id, mesh)

			const shape = shapeCore.shapeMap.value.get(id)
			if (shape) updateShapeMesh(shape)
		}

		overlay.requestDraw()
	},
	{ deep: true },
)
// TODO: called even if just moving a mouse but not moving a box
function updateMeshAppearance(shapeID: string, mesh: THREE.Mesh) {
	console.log('lockedShapeIDs:', [...remoteSelection.lockedShapeIDs.value], 'checking:', shapeID)

	const shapeMesh = (mesh.userData.mainMesh || mesh) as THREE.Mesh
	const isLocked = remoteSelection.lockedShapeIDs.value.has(shapeID)

	if (Array.isArray(shapeMesh.material)) {
		shapeMesh.material.forEach((mat) => {
			if ('color' in mat && mat.color instanceof THREE.Color) {
				mat.color.set(isLocked ? 0x888888 : new THREE.Color(shapeMesh.userData.color))
			}
		})
	} else {
		const mat = shapeMesh.material as THREE.MeshBasicMaterial
		mat.color.set(isLocked ? 0x888888 : new THREE.Color(shapeMesh.userData.color))
	}
}

watch(lineDraft.shape, () => syncDraft(lineDraft.shape.value), { deep: true })
watch(pencilDraft.shape, () => syncDraft(pencilDraft.shape.value), { deep: true })
function syncDraft(draft: Shape | null) {
	if (!draft) {
		for (const [id, mesh] of meshes.entries()) {
			if (id.startsWith('draft-')) {
				removeShapeMesh(id, mesh)
			}
		}
		return
	}

	for (const [id, mesh] of meshes.entries()) {
		if (id.startsWith('draft-') && id !== draft.id) {
			removeShapeMesh(id, mesh)
		}
	}

	if (!meshes.has(draft.id)) {
		createShapeMesh(draft)
	}

	updateShapeMesh(draft)
}

watch(shapes, syncAddRemove, { deep: true })
function syncAddRemove() {
	const currentIDs = new Set(shapes.value.map((s) => s.id))
	for (const [id, mesh] of meshes.entries()) {
		if (!currentIDs.has(id)) removeShapeMesh(id, mesh)
	}
	for (const shape of shapes.value) {
		if (!meshes.has(shape.id)) createShapeMesh(shape)
	}
}

watch(
	boundingBox.rawBox,
	() => {
		const ids = selection.selectedShapeIDs.value
		if (!ids || !ids.length) return
		ids.forEach((id) => {
			const shape = shapeCore.shapeMap.value.get(id)
			if (shape) updateShapeMesh(shape)
		})
	},
	{ deep: true },
)

function createShapeMesh(shape: Shape) {
	let mesh: THREE.Object3D

	if (shape.type === ShapeType.RECT) {
		const geo = new THREE.PlaneGeometry(1, 1)
		const mat = new THREE.MeshBasicMaterial({
			color: new THREE.Color(shape.color),
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 1,
		})
		const m = new THREE.Mesh(geo, mat)
		const width = shape.x2 - shape.x1
		const height = shape.y2 - shape.y1
		m.scale.set(width, height, 1)
		m.position.set(shape.x1 + width / 2, shape.y1 + height / 2, 0)
		m.rotation.z = shape.rotation || 0
		mesh = m
	} else if (shape.type === ShapeType.ELLIPSE) {
		const segments = 32
		const geo = new THREE.CircleGeometry(0.5, segments)
		const mat = new THREE.MeshBasicMaterial({
			color: new THREE.Color(shape.color),
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 1,
		})
		const m = new THREE.Mesh(geo, mat)
		const width = shape.x2 - shape.x1
		const height = shape.y2 - shape.y1
		m.scale.set(width, height, 1)
		m.position.set(shape.x1 + width / 2, shape.y1 + height / 2, 0)
		m.rotation.z = shape.rotation || 0
		mesh = m
	} else if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
		const points = [new THREE.Vector3(shape.x1, shape.y1, 0), new THREE.Vector3(shape.x2, shape.y2, 0)]
		const geo = new THREE.BufferGeometry().setFromPoints(points)
		const matLine = new THREE.LineBasicMaterial({ color: new THREE.Color(shape.color) })
		const line = new THREE.Line(geo, matLine)
		if (shape.type === ShapeType.ARROW) {
			const dir = new THREE.Vector3(shape.x2 - shape.x1, shape.y2 - shape.y1, 0).normalize()
			const length = Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1)
			const arrowSize = shape.arrowSize
			const arrowHelper = new THREE.ArrowHelper(
				dir,
				new THREE.Vector3(shape.x1, shape.y1, 0),
				length,
				shape.color,
				arrowSize,
				arrowSize * 0.5,
			)
			const group = new THREE.Object3D()
			group.add(line)
			group.add(arrowHelper)
			group.userData.mainMesh = line
			mesh = group
		} else {
			mesh = line
		}
	} else if (shape.type === ShapeType.PENCIL) {
		const pts = shape.points
		const positions = new Float32Array(pts.length * 3)
		for (let i = 0; i < pts.length; i++) {
			positions[i * 3] = pts[i].x
			positions[i * 3 + 1] = pts[i].y
			positions[i * 3 + 2] = 0
		}

		const geo = new LineGeometry()
		geo.setPositions(positions)

		const mat = new LineMaterial({
			color: new THREE.Color(shape.color),
			linewidth: shape.lineWidth,
			resolution: new THREE.Vector2(containerRef.value!.clientWidth, containerRef.value!.clientHeight),
		})

		const line = new Line2(geo, mat)
		line.scale.set(1, 1, 1)
		line.userData.pointCount = pts.length

		mesh = line
	} else {
		return
	}

	mesh.userData.id = shape.id
	mesh.userData.color = shape.color

	scene.value!.add(mesh)
	meshes.set(shape.id, mesh as THREE.Mesh)
}

function updateShapeMesh(shape: Shape) {
	const mesh = meshes.get(shape.id)
	if (!mesh) return
	if (shape.type === ShapeType.RECT || shape.type === ShapeType.ELLIPSE) {
		const width = shape.x2 - shape.x1
		const height = shape.y2 - shape.y1
		mesh.scale.set(width, height, 1)
		mesh.position.set(shape.x1 + width / 2, shape.y1 + height / 2, 0)
		mesh.rotation.z = shape.rotation || 0
		const mat = mesh.material as THREE.MeshBasicMaterial
		mat.color.set(shape.color)
	} else if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
		if (shape.type === ShapeType.LINE) {
			const points = [new THREE.Vector3(shape.x1, shape.y1, 0), new THREE.Vector3(shape.x2, shape.y2, 0)]
			mesh.geometry.dispose()
			mesh.geometry = new THREE.BufferGeometry().setFromPoints(points)
			const mat = mesh.material as THREE.LineBasicMaterial
			mat.color.set(shape.color)
		} else {
			removeShapeMesh(shape.id, mesh)
			createShapeMesh(shape)
			return
		}
	} else if (shape.type === ShapeType.PENCIL) {
		const pts = shape.points
		const positions = new Float32Array(pts.length * 3)
		for (let i = 0; i < pts.length; i++) {
			positions[i * 3] = pts[i].x
			positions[i * 3 + 1] = pts[i].y
			positions[i * 3 + 2] = 0
		}
		const line = mesh as Line2
		const geo = new LineGeometry()
		geo.setPositions(positions)
		line.geometry.dispose()
		line.geometry = geo

		const mat = line.material as LineMaterial
		mat.color = new THREE.Color(shape.color)
		mat.linewidth = shape.lineWidth

		line.userData.pointCount = pts.length
	}
}

function removeShapeMesh(id: string, obj: THREE.Object3D) {
	if (scene.value) {
		scene.value.remove(obj)
	}

	obj.traverse((node) => {
		if ((node as THREE.Mesh).isMesh) {
			const mesh = node as THREE.Mesh
			mesh.geometry.dispose()
			disposeMaterials(mesh)
		} else if ((node as THREE.Line).isLine) {
			const line = node as THREE.Line
			if (line.geometry) line.geometry.dispose()
			disposeMaterials(line)
		} else if ((node as THREE.Points).isPoints) {
			const points = node as THREE.Points
			if (points.geometry) points.geometry.dispose()
			disposeMaterials(points)
		}
	})

	meshes.delete(id)
}

watch(toolManager.selectedTool, () => {
	if (lineDraft.shape.value) {
		lineDraft.clear()
		draw()
	}
	if (pencilDraft.shape.value) {
		pencilDraft.clear()
		draw()
	}
})
</script>
