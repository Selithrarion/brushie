import * as THREE from 'three'

import type { PainterlyMaterialType } from '@/features/editor/types/three.types.ts'

export function disposeMaterials(material: THREE.Material | THREE.Material[]) {
	if (Array.isArray(material)) {
		material.forEach((m) => m.dispose())
	} else {
		material.dispose()
	}
}

export function collectMaterialsFromObject(obj: THREE.Object3D): THREE.Material[] {
	const mats: THREE.Material[] = []
	obj.traverse((child) => {
		if ('material' in child && child.material) {
			if (Array.isArray(child.material)) {
				mats.push(...child.material)
			} else {
				mats.push(child.material as THREE.Material)
			}
		}
	})
	return mats
}

// TODO: temporary skipping object3d and checking only painterly material
export function isShaderMaterial(mat: THREE.Material): mat is PainterlyMaterialType {
	if (!mat) return false
	return 'uniforms' in mat
}
