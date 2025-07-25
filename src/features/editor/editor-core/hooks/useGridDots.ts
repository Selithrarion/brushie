import * as THREE from 'three'
import { type ShallowRef, watch } from 'vue'

import { useZoom3D } from '@/features/editor/editor-core/hooks/useZoom3D.ts'

export function useGridDots(scene: ShallowRef<THREE.Scene | null>, zoom: ReturnType<typeof useZoom3D>) {
	const FADE_RANGE = 1

	const SCALES = [
		{ gap: 200, minZoom: 0, maxZoom: 0.3 },
		{ gap: 50, minZoom: 0.3, maxZoom: 1.5 },
		{ gap: 10, minZoom: 2, maxZoom: 3.0 },
		{ gap: 5, minZoom: 3.0, maxZoom: Infinity },
	]

	const materials: THREE.PointsMaterial[] = []

	watch(scene, initDots)
	function initDots() {
		for (const scaleLayer of SCALES) {
			const positions = []
			for (let x = -5000; x <= 5000; x += scaleLayer.gap) {
				for (let y = -5000; y <= 5000; y += scaleLayer.gap) {
					positions.push(x, y, 0)
				}
			}
			const geometry = new THREE.BufferGeometry()
			geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

			const material = new THREE.PointsMaterial({
				color: new THREE.Color('#708090'),
				size: 3,
				transparent: true,
				opacity: 0,
			})
			materials.push(material)

			const points = new THREE.Points(geometry, material)
			scene.value!.add(points)
		}
	}

	function getOpacity(zoom: number, minZoom: number, maxZoom: number) {
		const isBeforeFadeStart = zoom < minZoom - FADE_RANGE
		const isAfterFadeEnd = zoom > maxZoom + FADE_RANGE
		if (isBeforeFadeStart || isAfterFadeEnd) return 0

		let opacity = 1

		const isInsideRange = zoom >= minZoom && zoom <= maxZoom
		if (isInsideRange) opacity = 1

		const isInFadeOutZone = zoom > maxZoom && zoom < maxZoom + FADE_RANGE
		if (isInFadeOutZone) {
			opacity = 1 - (zoom - maxZoom) / FADE_RANGE
		}

		const isInFadeInZone = zoom < minZoom && zoom > minZoom - FADE_RANGE
		if (isInFadeInZone) {
			opacity = (zoom - (minZoom - FADE_RANGE)) / FADE_RANGE
		}

		return opacity / 3
	}

	watch(zoom.scale, update, { immediate: true })
	function update() {
		materials.forEach((mat, i) => {
			const { minZoom, maxZoom } = SCALES[i]
			mat.opacity = getOpacity(zoom.scale.value, minZoom, maxZoom)
			mat.opacity = THREE.MathUtils.clamp(mat.opacity, 0, 1)
		})
	}

	return {}
}
