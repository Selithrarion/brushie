import * as THREE from 'three'
import type { Ref } from 'vue'

import type { PositionXY } from '@/shared/types/PositionXY.ts'

export function usePointer3DTools(containerRef: Ref<HTMLElement | null>, camera: Ref<THREE.OrthographicCamera | null>) {
	const pointer = new THREE.Vector2()
	const raycaster = new THREE.Raycaster()
	const planeZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)

	// NDC -- normalized distance coordinates -1 to +1
	function setPointerNDC({ x, y }: PositionXY) {
		const rect = containerRef.value!.getBoundingClientRect()
		pointer.x = ((x - rect.left) / rect.width) * 2 - 1
		pointer.y = -((y - rect.top) / rect.height) * 2 + 1
	}

	// pixels -> -1 +1 -> 0 1
	function screenToWorld(pos: PositionXY) {
		setPointerNDC(pos)
		raycaster.setFromCamera(pointer, camera.value!)

		const worldPos = new THREE.Vector3()
		raycaster.ray.intersectPlane(planeZ0, worldPos)

		return { x: worldPos.x, y: worldPos.y }
	}

	// -1 +1 -> 0 1 -> pixels (inverted Y from webgl to canvas)
	function worldToScreen({ x, y }: PositionXY) {
		const v = new THREE.Vector3(x, y, 0)
		v.project(camera.value!)

		const w = containerRef.value!.clientWidth
		const h = containerRef.value!.clientHeight

		return {
			x: (v.x * 0.5 + 0.5) * w,
			y: (-v.y * 0.5 + 0.5) * h,
		}
	}

	// cpu-based + cant handle transparent + cant handle shader displacements
	function raycasterIntersect(pos: PositionXY, meshes: THREE.Object3D[]) {
		setPointerNDC(pos)
		raycaster.setFromCamera(pointer, camera.value!)
		return raycaster.intersectObjects(meshes)
	}

	return { pointer, raycaster, planeZ0, setPointerNDC, screenToWorld, worldToScreen, raycasterIntersect }
}
