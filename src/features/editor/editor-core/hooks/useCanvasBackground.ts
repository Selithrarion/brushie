import { useRafFn } from '@vueuse/core'
import * as THREE from 'three'
import { onMounted, onUnmounted, type Ref } from 'vue'

import type { useZoom3D } from '@/features/editor/editor-core/hooks/useZoom3D.ts'
import { BackgroundMaterial } from '@/features/editor/editor-core/materials/background/BackgroundMaterial.ts'
import { disposeMaterials } from '@/features/editor/utils/three.utils.ts'

interface Deps {
	containerRef: Ref<HTMLElement | null>
	scene: Ref<THREE.Scene | null>
	camera: Ref<THREE.Camera | null>
	zoom: ReturnType<typeof useZoom3D>
}

export function useCanvasBackground(deps: Deps) {
	let mesh: THREE.Mesh | null = null

	onMounted(() => {
		if (!deps.scene.value || !deps.camera.value) return

		const geometry = new THREE.PlaneGeometry(1, 1)
		const material = BackgroundMaterial()

		mesh = new THREE.Mesh(geometry, material)
		mesh.renderOrder = -999
		mesh.frustumCulled = false
		mesh.position.set(0, 0, -1)

		deps.scene.value.add(mesh)
	})

	useRafFn(() => {
		if (!mesh || !deps.camera.value) return

		const aspect = deps.containerRef.value!.clientWidth / deps.containerRef.value!.clientHeight
		const halfW = (aspect * deps.zoom.ZOOM_FACTOR) / (2 * deps.zoom.scale.value)
		const halfH = deps.zoom.ZOOM_FACTOR / (2 * deps.zoom.scale.value)

		mesh.scale.set(halfW * 2, halfH * 2, 1)
		mesh.position.set(deps.camera.value.position.x, deps.camera.value.position.y, -1)
	})

	onUnmounted(() => {
		if (mesh) {
			deps.scene.value?.remove(mesh)
			mesh.geometry.dispose()
			disposeMaterials(mesh.material)
			mesh = null
		}
	})
}
