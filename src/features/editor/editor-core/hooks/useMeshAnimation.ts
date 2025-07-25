import gsap from 'gsap'
import * as THREE from 'three'
import type { LineMaterial } from 'three/examples/jsm/lines/LineMaterial'
import { type Ref } from 'vue'

import type PainterlyMaterial from '@/features/editor/editor-core/materials/painterly/PainterlyMaterial.ts'

export function useMeshAnimation(
	requestDraw: Ref<() => void>,
	meshes: Map<string, THREE.Object3D>,
	remove: (id: string, obj: THREE.Object3D) => void,
) {
	function animateCreate(mesh: THREE.Mesh, finalWidth: number, finalHeight: number) {
		mesh.scale.set(finalWidth * 0.5, finalHeight * 0.5, 1)
		gsap.to(mesh.scale, {
			x: finalWidth * 1.1,
			y: finalHeight * 1.1,
			duration: 0.15,
			onComplete() {
				gsap.to(mesh.scale, {
					x: finalWidth,
					y: finalHeight,
					duration: 0.15,
					onUpdate: () => requestDraw.value(),
				})
			},
			onUpdate: () => requestDraw.value(),
		})
		gsap.to(mesh.rotation, {
			z: '-=0.15',
			duration: 0.15,
			yoyo: true,
			repeat: 1,
			onUpdate: () => requestDraw.value(),
		})
		gsap.from(mesh.material, {
			opacity: 0,
			duration: 0.3,
			onUpdate: () => requestDraw.value(),
		})
	}

	function animateCreateBrush(mat: PainterlyMaterial) {
		for (let i = 0; i < mat.brushCount; i++) {
			mat.brushOpacities[i] = 0
			gsap.to(mat.uniforms.uBrushOpacities.value, {
				[i]: 1,
				duration: 0.2,
				delay: i * 0.075,
				onUpdate: () => requestDraw.value(),
			})
		}
	}

	function animateRemoveBrush(id: string, mesh: THREE.Object3D) {
		const mat = (mesh as THREE.Mesh).material as PainterlyMaterial
		const finalScaleX = mesh.scale.x * 0.9
		const finalScaleY = mesh.scale.y * 0.9

		gsap.to(mesh.scale, {
			x: finalScaleX,
			y: finalScaleY,
			duration: 0.4,
			onUpdate: () => requestDraw.value(),
		})

		for (let i = mat.brushCount - 1; i >= 0; i--) {
			gsap.to(mat.uniforms.uBrushOpacities.value, {
				[i]: 0,
				duration: 0.1,
				delay: (mat.brushCount - 1 - i) * 0.05,
				onUpdate: () => requestDraw.value(),
			})
		}

		gsap.to(mat, {
			opacity: 0,
			duration: 0.1,
			delay: (mat.brushCount - 1) * 0.05,
			onUpdate: () => requestDraw.value(),
			onComplete: () => {
				for (let i = 0; i < mat.brushCount; i++) {
					mat.uniforms.uBrushOpacities.value[i] = 0
				}
				const obj = meshes.get(id)
				if (obj) remove(id, obj)
			},
		})
	}

	function animateRemoveFade(id: string, mesh: THREE.Object3D) {
		const mat = (mesh as THREE.Mesh).material as LineMaterial
		gsap.to(mat, {
			opacity: 0,
			duration: 0.3,
			onUpdate: () => requestDraw.value(),
			onComplete: () => {
				const obj = meshes.get(id)
				if (obj) remove(id, obj)
			},
		})
	}

	function animateRemoveFadeGroup(id: string, group: THREE.Object3D) {
		group.traverse((child) => {
			if (child.type === 'Mesh') {
				const mat = (child as THREE.Mesh).material as PainterlyMaterial
				for (let i = 0; i < mat.brushCount; i++) {
					gsap.to(mat.uniforms.uBrushOpacities.value, {
						[i]: 0,
						duration: 0.3,
						onUpdate: () => requestDraw.value(),
					})
				}
			}
		})

		gsap.delayedCall(0.3, () => {
			const obj = meshes.get(id)
			if (obj) remove(id, obj)
		})
	}

	return {
		animateCreate,
		animateCreateBrush,
		animateRemoveBrush,
		animateRemoveFade,
		animateRemoveFadeGroup,
	}
}
