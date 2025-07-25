import * as THREE from 'three'

import fragment from './fragment.glsl'
import vertex from './vertex.glsl'

export default class ParticleMaterial extends THREE.ShaderMaterial {
	constructor({ pointSize = 8 }: { pointSize?: number } = {}) {
		super({
			uniforms: {
				uPointSize: { value: pointSize },
			},

			vertexShader: vertex,
			fragmentShader: fragment,

			transparent: true,
			depthWrite: false,
		})
	}
}
