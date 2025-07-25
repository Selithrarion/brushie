<template>
	<div class="fixed top-2 left-2 z-50 rounded bg-pink-300 p-2 text-xs text-white">
		<div>FPS: {{ fps }} (avg: {{ fpsAvg.toFixed(1) }})</div>

		<div>Meshes: {{ meshCount }}</div>
		<div>Vertices: {{ vertexCount }}</div>

		<div v-if="memoryUsed !== null">Memory: {{ memoryUsed.toFixed(2) }} MB</div>

		<div>Draw Calls: {{ drawCalls }}</div>
	</div>
</template>

<script setup lang="ts">
import * as THREE from 'three'
import type { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { ref, onMounted } from 'vue'

import { ShapeType } from '@/features/editor/types/shape.types.ts'

const props = defineProps<{
	scene: THREE.Scene
	renderer: THREE.WebGLRenderer
}>()

function update() {
	measureFps()
	measureCounts()
	measureMemory()
	measureDrawCalls()
	requestAnimationFrame(update)
}

const fps = ref(0)
const fpsAvg = ref(0)
const frames = ref(0)
let lastTime = performance.now()
const frameTimes: number[] = []
function measureFps() {
	const now = performance.now()
	frames.value++

	const delta = now - lastTime
	if (delta >= 1000) {
		fps.value = frames.value
		frameTimes.push(fps.value)
		if (frameTimes.length > 60) frameTimes.shift()
		fpsAvg.value = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length

		frames.value = 0
		lastTime = now
	}
}

const meshCount = ref(0)
const vertexCount = ref(0)
function measureCounts() {
	let mesh = 0
	let vertex = 0

	props.scene.traverse((obj) => {
		const isStroke = obj.userData.shapeType === ShapeType.LINE || obj.userData.shapeType === ShapeType.ARROW
		const isMesh = (obj as THREE.Mesh).isMesh
		const isPencil = (obj as Line2).isLine2

		if (isStroke) {
			if (obj.children && obj.children.length > 0) {
				obj.children.forEach((child) => {
					const isChildMesh = (child as THREE.Mesh).isMesh
					if (isChildMesh) {
						mesh++
						const geom = (child as THREE.Mesh).geometry
						if (geom && geom.attributes.position) {
							vertex += geom.attributes.position.count
						}
					}
				})
			}
		} else if (isPencil) {
			mesh++
			vertex += obj.userData.pointCount || 0
		} else if (isMesh) {
			mesh++
			const g = (obj as THREE.Mesh).geometry
			if (g && g.isBufferGeometry && g.attributes.position) {
				vertex += g.attributes.position.count
			}
		}
	})

	meshCount.value = mesh
	vertexCount.value = vertex
}

const memoryUsed = ref<number | null>(null)
function measureMemory() {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	if ((performance as any).memory) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		memoryUsed.value = (performance as any).memory.usedJSHeapSize / 1024 / 1024
	}
}

const drawCalls = ref(0)
function measureDrawCalls() {
	drawCalls.value = props.renderer.info.render.calls
}

onMounted(() => {
	requestAnimationFrame(update)
})
</script>
