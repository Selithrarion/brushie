import { gsap } from 'gsap'
import * as THREE from 'three'

import { useParticleSystem } from '@/features/editor/editor-core/hooks/useParticleSystem.ts'
import type PainterlyMaterial from '@/features/editor/editor-core/materials/painterly/PainterlyMaterial.ts'
import type { useShapeCore } from '@/features/editor/editor-shapes/hooks/useShapeCore.ts'
import { isShaderMaterial } from '@/features/editor/utils/three.utils.ts'

interface Deps {
	particleSystem: ReturnType<typeof useParticleSystem>
	shapeCore: ReturnType<typeof useShapeCore>
	meshes: Map<string, THREE.Object3D>
	onShapeDeleted: () => void
}

export function usePainterlyInteractions({ particleSystem, shapeCore, meshes, onShapeDeleted }: Deps) {
	function handleClick(shapeID: string) {
		const shape = shapeCore.shapeMap.get(shapeID)
		const mesh = meshes.get(shapeID) as THREE.Mesh
		if (!shape || !mesh) return

		const material = mesh.material as PainterlyMaterial
		if (!isShaderMaterial(material)) return

		if (material.uniforms.uBrushCount.value <= 0) return

		const index = material.uniforms.uBrushCount.value - 1
		const r = material.uniforms.uBrushBaseColors.value[index * 3]
		const g = material.uniforms.uBrushBaseColors.value[index * 3 + 1]
		const b = material.uniforms.uBrushBaseColors.value[index * 3 + 2]
		const color = new THREE.Color(r, g, b)

		material.uniforms.uBrushCount.value--

		if (material.uniforms.uBrushCount.value === 0) {
			particleSystem.emitExplode(mesh.position, mesh.scale, color)
			shapeCore.removeByIDs([shape.id])
			onShapeDeleted()
		} else if (material.uniforms.uBrushCount.value >= 1) particleSystem.emitSplash(mesh.position, mesh.scale, color)
	}

	return {
		handleClick,
	}
}
