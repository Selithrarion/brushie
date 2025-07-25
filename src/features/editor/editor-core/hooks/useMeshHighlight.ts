import gsap from 'gsap'
import * as THREE from 'three'
import { type Ref, watch, computed } from 'vue'

import type PainterlyMaterial from '@/features/editor/editor-core/materials/painterly/PainterlyMaterial.ts'
import { useBoundingBox } from '@/features/editor/editor-shapes/hooks/useBoundingBox.ts'
import { useShapeSelection } from '@/features/editor/editor-shapes/hooks/useShapeSelection.ts'

const SPEED = 0.3
const COLOR_SHIFT_MAX = 0.3

export function useMeshHighlight(deps: {
	selection: ReturnType<typeof useShapeSelection>
	boundingBox: ReturnType<typeof useBoundingBox>
	meshes: Map<string, THREE.Object3D>
	requestDraw: Ref<() => void>
}) {
	const activeShapeIDs = computed(() => {
		if (deps.selection.selectedShapeIDs.value.length) {
			return deps.selection.selectedShapeIDs.value
		} else if (deps.boundingBox.hoveredShapeID.value) {
			// TODO: and if not locked
			return [deps.boundingBox.hoveredShapeID.value]
		} else {
			return []
		}
	})

	function setColorShift(obj: THREE.Object3D, target: number) {
		const mesh = obj as THREE.Mesh
		const material = mesh.material as PainterlyMaterial | undefined
		if (!material || !material.uniforms?.uColorShiftAmount) return

		gsap.to(material.uniforms.uColorShiftAmount, {
			value: target,
			duration: SPEED,
			onUpdate: () => deps.requestDraw.value(),
		})
	}

	let previousActiveIDs = new Set<string>()
	watch(activeShapeIDs, (newIDs) => {
		const newSet = new Set(newIDs)

		for (const id of previousActiveIDs) {
			if (!newSet.has(id)) {
				const mesh = deps.meshes.get(id)
				if (mesh) setColorShift(mesh, 0)
			}
		}

		for (const id of newSet) {
			if (!previousActiveIDs.has(id)) {
				const mesh = deps.meshes.get(id)
				if (mesh) setColorShift(mesh, COLOR_SHIFT_MAX)
			}
		}

		previousActiveIDs = newSet
	})
}
