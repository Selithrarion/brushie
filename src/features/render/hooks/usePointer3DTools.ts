import * as THREE from 'three'
import type { Ref } from 'vue'

import type { PositionXY } from '@/shared/types/PositionXY.ts'

export function usePointer3DTools(containerRef: Ref<HTMLElement | undefined>, cameraRef: Ref<THREE.OrthographicCamera | null>) {
	const pointer = new THREE.Vector2()
	const raycaster = new THREE.Raycaster()
	const planeZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)

	// NDC -- normalized distance coordinates -1 to +1
	function setPointerNDC($event: MouseEvent) {
		const rect = containerRef.value!.getBoundingClientRect()
		pointer.x = (($event.clientX - rect.left) / rect.width) * 2 - 1
		pointer.y = -(($event.clientY - rect.top) / rect.height) * 2 + 1
	}

	// pixels -> -1 +1 -> 0 1
	function screenToWorld($event: MouseEvent) {
		setPointerNDC($event)
		raycaster.setFromCamera(pointer, cameraRef.value!)

		const worldPos = new THREE.Vector3()
		raycaster.ray.intersectPlane(planeZ0, worldPos)

		return { x: worldPos.x, y: worldPos.y }
	}

	// -1 +1 -> 0 1 -> pixels (inverted Y from webgl to canvas)
	function worldToScreen({ x, y }: PositionXY) {
		const v = new THREE.Vector3(x, y, 0)
		v.project(cameraRef.value!)

		const w = containerRef.value!.clientWidth
		const h = containerRef.value!.clientHeight

		return {
			x: (v.x * 0.5 + 0.5) * w,
			y: (-v.y * 0.5 + 0.5) * h,
		}
	}

	function raycasterIntersect($event: MouseEvent, meshes: THREE.Object3D[]) {
		setPointerNDC($event)
		raycaster.setFromCamera(pointer, cameraRef.value!)
		return raycaster.intersectObjects(meshes)
	}

	return { pointer, raycaster, planeZ0, setPointerNDC, screenToWorld, worldToScreen, raycasterIntersect }
}
