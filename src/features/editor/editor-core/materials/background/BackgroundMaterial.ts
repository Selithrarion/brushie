import * as THREE from 'three'

import fragmentShader from '@/features/editor/editor-core/materials/background/fragment.glsl'
import vertexShader from '@/features/editor/editor-core/materials/background/vertex.glsl'

export function BackgroundMaterial() {
	return new THREE.ShaderMaterial({
		vertexShader,
		fragmentShader,
		depthWrite: false,
		depthTest: false,
	})
}
