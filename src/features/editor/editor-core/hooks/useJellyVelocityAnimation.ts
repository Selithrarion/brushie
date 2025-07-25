import { gsap } from 'gsap'
import { ref } from 'vue'

import { lerp } from '@/features/math/lerp.ts'

const SMOOTH_FACTOR = 0.1
const TICK_DAMPING_FACTOR = 0.9
const VELOCITY_TIME_STEP = 8
const MAX_RADIUS_VELOCITY = 0.5
const CORNER_RADIUS_SCALE = 0.9

export function useJellyVelocityAnimation() {
	const rawVelocity = { x: 0, y: 0 }
	const velocity = ref({ x: 0, y: 0 })
	const cornerRadius = ref(0)

	let lastX = 0
	let lastY = 0

	function update(x: number, y: number) {
		if (lastX === 0 && lastY === 0) {
			lastX = x
			lastY = y
			return
		}
		if (x === lastX && y === lastY) return

		const dx = x - lastX
		const dy = y - lastY

		rawVelocity.x = dx / VELOCITY_TIME_STEP
		rawVelocity.y = dy / VELOCITY_TIME_STEP

		lastX = x
		lastY = y
	}

	function tick() {
		rawVelocity.x *= TICK_DAMPING_FACTOR
		rawVelocity.y *= TICK_DAMPING_FACTOR
		const v = Math.hypot(velocity.value.x, velocity.value.y)

		velocity.value.x = lerp(velocity.value.x, rawVelocity.x, SMOOTH_FACTOR)
		velocity.value.y = lerp(velocity.value.y, rawVelocity.y, SMOOTH_FACTOR)

		const targetRadius = Math.min(v, MAX_RADIUS_VELOCITY) * CORNER_RADIUS_SCALE
		gsap.to(cornerRadius, {
			value: targetRadius,
			duration: 0.2,
		})
	}

	function reset() {
		lastX = 0
		lastY = 0
		rawVelocity.x = 0
		rawVelocity.y = 0
		velocity.value.x = 0
		velocity.value.y = 0
		cornerRadius.value = 0
	}

	return {
		velocity,
		cornerRadius,
		update,
		tick,
		reset,
	}
}
