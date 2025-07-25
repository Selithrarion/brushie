import { useEventListener } from '@vueuse/core'
import type * as THREE from 'three'
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { onMounted, type Ref } from 'vue'

import { useZoom3D } from '@/features/editor/editor-core/hooks/useZoom3D.ts'

interface Deps {
	renderer: Ref<THREE.WebGLRenderer | null>
	composer?: Ref<EffectComposer | null>
	camera: Ref<THREE.Camera | null>
	containerRef: Ref<HTMLElement | null>
	zoom: ReturnType<typeof useZoom3D>
	requestDraw: Ref<() => void>
}

export function useResizeHandler(deps: Deps) {
	function handleWindowResize() {
		if (!deps.renderer.value || !deps.camera.value || !deps.containerRef.value) return

		const w = deps.containerRef.value.clientWidth
		const h = deps.containerRef.value.clientHeight

		deps.renderer.value.setSize(w, h, false)
		deps.composer?.value?.setSize(w, h, false)

		deps.zoom.updateCameraFromZoom()
		deps.requestDraw.value()
	}

	onMounted(() => {
		handleWindowResize()
	})

	useEventListener(window, 'resize', handleWindowResize)
}
