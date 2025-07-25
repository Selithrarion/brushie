import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { type Ref, shallowRef, watch } from 'vue'

import { RetroPass } from '@/features/editor/editor-core/shaders/retro/RetroPass.ts'

export interface Deps {
	renderer: Ref<THREE.WebGLRenderer | null>
	scene: Ref<THREE.Scene | null>
	camera: Ref<THREE.OrthographicCamera | null>
	containerRef: Ref<HTMLElement | null>
}

export function usePostProcessing(deps: Deps) {
	const composer = shallowRef<EffectComposer | null>(null)
	const retroPass = shallowRef<ShaderPass | null>(null)

	watch(
		() => [deps.renderer.value, deps.scene.value, deps.camera.value],
		([renderer, scene, camera]) => {
			if (!renderer || !scene || !camera) return

			composer.value = new EffectComposer(renderer)
			composer.value.setSize(deps.containerRef.value!.clientWidth, deps.containerRef.value!.clientHeight)

			composer.value.addPass(new RenderPass(scene, camera))

			retroPass.value = RetroPass()
			composer.value.addPass(retroPass.value)
		},
		{ immediate: true },
	)

	function renderFrame(delta: number) {
		if (!composer.value) return
		retroPass.value.uniforms.uTime.value += delta
		composer.value.render()
	}

	return {
		composer,
		retroPass,
		renderFrame,
	}
}
