import * as THREE from 'three'
import { watchEffect, shallowRef, type Ref } from 'vue'

import ParticleMaterial from '@/features/editor/editor-core/materials/particle/ParticleMaterial.ts'
import { easeOutSquared } from '@/features/math/easing.ts'
import { generateShiftedColors } from '@/shared/utils/colors.ts'

interface EmitConfig {
	meshCenter: THREE.Vector3
	meshScale: THREE.Vector3
	color: THREE.Color | THREE.Color[]
	count: number
	lifetime?: number
	speed?: [min: number, max: number]
	size?: [min: number, max: number]
	angle?: [min: number, max: number]
	offset?: [x: number, y: number]
}

const DEFAULT_MESH_SIZE = 30

// TODO: can migrate from cpu rendering to gpgpu? read later about render targets, framebuffer ping-ponging, DataTexture
export function useParticleSystem(scene: Ref<THREE.Scene | null>) {
	const points = shallowRef<THREE.Points | null>(null)

	const capacity = 120
	const positions = new Float32Array(capacity * 3)
	const lifetimes = new Float32Array(capacity)
	const velocities = new Float32Array(capacity * 3)
	const initialVelocities = new Float32Array(capacity * 3)
	const colors = new Float32Array(capacity * 3)
	const sizes = new Float32Array(capacity)

	watchEffect(() => scene.value && !points.value && init())

	function init() {
		const geometry = new THREE.BufferGeometry()
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
		geometry.setAttribute('aLifetime', new THREE.BufferAttribute(lifetimes, 1))
		geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
		geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))

		const material = new ParticleMaterial()
		points.value = new THREE.Points(geometry, material)
		points.value.frustumCulled = false

		scene.value?.add(points.value)
	}

	function update(delta: number) {
		for (let i = 0; i < capacity; i++) {
			if (lifetimes[i] <= 0) continue

			positions[i * 3] += velocities[i * 3] * delta
			positions[i * 3 + 1] += velocities[i * 3 + 1] * delta

			const t = 1 - lifetimes[i]
			const ease = easeOutSquared(t)
			velocities[i * 3] = initialVelocities[i * 3] * (1 - ease)
			velocities[i * 3 + 1] = initialVelocities[i * 3 + 1] * (1 - ease)
			velocities[i * 3 + 2] = initialVelocities[i * 3 + 2] * (1 - ease)

			lifetimes[i] -= delta
			if (lifetimes[i] < 0) lifetimes[i] = 0
		}

		if (points.value) points.value.geometry.attributes.position.needsUpdate = true
		if (points.value) points.value.geometry.attributes.aLifetime.needsUpdate = true
		if (points.value) points.value.geometry.attributes.aColor.needsUpdate = true
		if (points.value) points.value.geometry.attributes.aSize.needsUpdate = true
	}

	function findFreeIndex() {
		for (let i = 0; i < capacity; i++) if (lifetimes[i] <= 0) return i
		return -1
	}

	function emit(config: EmitConfig) {
		// TODO: do it properly
		const max = Math.max(config.meshScale.x, config.meshScale.y)
		const scaleFactor = max === DEFAULT_MESH_SIZE ? 1 : (max / DEFAULT_MESH_SIZE) * 0.5

		for (let j = 0; j < config.count; j++) {
			const i = findFreeIndex()
			if (i < 0) break

			const angle = (config.angle?.[0] || 0) + Math.random() * ((config.angle?.[1] || 0) - (config.angle?.[0] || 0))
			const speed = (config.speed?.[0] || 0) + Math.random() * ((config.speed?.[1] || 1) - (config.speed?.[0] || 0))
			const offsetX = (Math.random() - 0.5) * (config.offset?.[0] || 0) * scaleFactor
			const offsetY = (Math.random() - 0.5) * (config.offset?.[1] || 0) * scaleFactor

			const px = config.meshCenter.x + offsetX
			const py = config.meshCenter.y + offsetY
			const pz = config.meshCenter.z + 0.1

			positions[i * 3] = px
			positions[i * 3 + 1] = py
			positions[i * 3 + 2] = pz

			lifetimes[i] = config.lifetime || 1
			sizes[i] = ((config.size?.[0] || 1) + Math.random() * ((config.size?.[1] || 1) - (config.size?.[0] || 1))) * scaleFactor

			const vx = Math.cos(angle) * speed * scaleFactor
			const vy = Math.sin(angle) * speed * scaleFactor

			velocities[i * 3] = vx
			velocities[i * 3 + 1] = vy
			velocities[i * 3 + 2] = 0

			initialVelocities[i * 3] = vx
			initialVelocities[i * 3 + 1] = vy
			initialVelocities[i * 3 + 2] = 0

			const c = pickColor(config.color)
			colors[i * 3] = c.r
			colors[i * 3 + 1] = c.g
			colors[i * 3 + 2] = c.b
		}
	}
	function pickColor(source: THREE.Color | THREE.Color[]): THREE.Color {
		return Array.isArray(source) ? source[Math.floor(Math.random() * source.length)] : source
	}

	function emitSplash(meshCenter: THREE.Vector3, meshScale: THREE.Vector3, color: THREE.Color) {
		const halfHeight = meshScale.y / 2
		emit({
			meshCenter: meshCenter.clone().add(new THREE.Vector3(0, halfHeight, 0)),
			meshScale,
			color,
			count: 6,
			speed: [20, 40],
			angle: [Math.PI / 2 - 0.2, Math.PI / 2 + 0.2],
			offset: [30, 10],
			size: [1, 3],
		})
	}

	function emitExplode(meshCenter: THREE.Vector3, meshScale: THREE.Vector3, color: THREE.Color) {
		const raw = generateShiftedColors(color, 20)
		const colorVariants = Array.from({ length: 20 }, (_, i) => new THREE.Color(raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]))
		emit({
			meshCenter,
			meshScale,
			color: colorVariants,
			count: 20,
			speed: [20, 80],
			angle: [0, Math.PI * 2],
			offset: [0, 0],
			size: [1, 3],
		})
	}

	return { emit, update, emitSplash, emitExplode }
}
