import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'

import fragment from './fragment.glsl'
import vertex from './vertex.glsl'

// NOTE: thought about using paper texture but lazy to think how to make it feel real on whole canvas
// and maybe its too much
// decided to do it on the PainterlyMaterial instead
export function RetroPass() {
	const uniforms = {
		tDiffuse: { value: 0 },
		uTime: { value: 0 },
	}

	const vertexShader = vertex
	const fragmentShader = fragment

	return new ShaderPass({ uniforms, vertexShader, fragmentShader })
}
