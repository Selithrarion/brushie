import { clamp } from '@vueuse/core'
import * as THREE from 'three'
import { type Ref, ref } from 'vue'

import type { usePointer3DTools } from '@/features/render/hooks/usePointer3DTools.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'

export function useZoom3D(
	containerRef: Ref<HTMLElement | undefined>,
	cameraRef: Ref<THREE.OrthographicCamera | null>,
	pointer3DTools: ReturnType<typeof usePointer3DTools>,
	roomID: string,
	onUpdate: Ref<() => void>,
) {
	const STORAGE_KEY = `zoom-${roomID}`

	const scale = ref(1)
	const offset = ref({ x: 0, y: 0 })

	const MIN_SCALE = 0.1
	const MAX_SCALE = 100
	const ZOOM_FACTOR = 500

	function updateCameraFromZoom() {
		if (!cameraRef.value) return

		const w = containerRef.value!.clientWidth
		const h = containerRef.value!.clientHeight
		const s = scale.value
		const aspect = w / h
		const halfW = (aspect * ZOOM_FACTOR) / (2 * s)
		const halfH = ZOOM_FACTOR / (2 * s)

		cameraRef.value.left = -halfW
		cameraRef.value.right = halfW
		cameraRef.value.top = halfH
		cameraRef.value.bottom = -halfH
		cameraRef.value.position.set(offset.value.x, offset.value.y, cameraRef.value.position.z)
		cameraRef.value.updateProjectionMatrix()
	}

	function handleWheel3D($event: WheelEvent) {
		if (!containerRef.value || !cameraRef.value) return
		$event.preventDefault()
		const delta = $event.deltaY < 0 ? 1.1 : 0.9
		zoomAt(delta, { x: $event.clientX, y: $event.clientY })
	}

	function zoomIn() {
		zoomAt(1.1)
	}
	function zoomOut() {
		zoomAt(0.9)
	}

	function zoomAt(factor: number, center?: PositionXY) {
		if (!containerRef.value || !cameraRef.value) return

		const { x, y } = getCenterCoords(center)

		pointer3DTools.setPointerNDC({ clientX: x, clientY: y } as MouseEvent)
		pointer3DTools.raycaster.setFromCamera(pointer3DTools.pointer, cameraRef.value)
		const before = new THREE.Vector3()
		pointer3DTools.raycaster.ray.intersectPlane(pointer3DTools.planeZ0, before)

		scale.value = clamp(scale.value * factor, MIN_SCALE, MAX_SCALE)

		updateCameraFromZoom()

		pointer3DTools.raycaster.setFromCamera(pointer3DTools.pointer, cameraRef.value)
		const after = new THREE.Vector3()
		pointer3DTools.raycaster.ray.intersectPlane(pointer3DTools.planeZ0, after)

		offset.value.x += before.x - after.x
		offset.value.y += before.y - after.y

		updateCameraFromZoom()

		saveZoomState()
		onUpdate.value()
	}
	function zoomAtCenter(factor: number) {
		const center = getCenterCoords()
		zoomAt(factor, center)
	}

	function getCenterCoords(center?: PositionXY) {
		if (!containerRef.value) return { x: 0, y: 0 }
		const rect = containerRef.value.getBoundingClientRect()
		return {
			x: center?.x ?? rect.width / 2,
			y: center?.y ?? rect.height / 2,
		}
	}

	function resetZoom() {
		scale.value = 1
		updateCameraFromZoom()
		saveZoomState()
	}

	function saveZoomState() {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				scale: scale.value,
				offset: offset.value,
			}),
		)
	}
	function loadZoomState() {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (raw) {
			try {
				const parsed = JSON.parse(raw)
				scale.value = parsed.scale || 5
				offset.value = parsed.offset || { x: 0, y: 0 }
			} catch {
				console.error('failed to load zoom state')
			}
		}
	}

	loadZoomState()

	return { ZOOM_FACTOR, scale, offset, updateCameraFromZoom, handleWheel3D, zoomIn, zoomOut, zoomAtCenter, zoomAt, resetZoom }
}
