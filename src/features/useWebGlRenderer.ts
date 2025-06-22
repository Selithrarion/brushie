import * as THREE from 'three'
import { shallowRef, onMounted, onBeforeUnmount, type Ref } from 'vue'

export function useWebGlRenderer(webglCanvasRef: Ref<HTMLElement | undefined>) {
	const renderer = shallowRef<THREE.WebGLRenderer | null>(null)
	const scene = shallowRef<THREE.Scene | null>(null)
	const camera = shallowRef<THREE.OrthographicCamera | null>(null)

	onMounted(() => {
		initScene()
	})
	onBeforeUnmount(() => {
		renderer.value?.dispose()
		renderer.value = null
		scene.value = null
		camera.value = null
	})

	function initScene() {
		scene.value = new THREE.Scene()

		renderer.value = new THREE.WebGLRenderer({
			canvas: webglCanvasRef.value!,
			antialias: true,
			alpha: true,
		})
		renderer.value.setClearColor(0x000000, 0)
		renderer.value.setPixelRatio(window.devicePixelRatio)

		camera.value = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000)
		camera.value.position.z = 5
	}

	return {
		renderer,
		scene,
		camera,
	}
}
