import { clamp, useRafFn } from '@vueuse/core'
import gsap from 'gsap'
import { ref, onMounted, nextTick, watch } from 'vue'

import type { useZoom3D } from '@/features/editor/editor-core/hooks/useZoom3D.ts'

const CONFIG = {
	offsetMultiplier: 5,
	scaleMultiplier: 0.1,

	returnTimeout: 200,
	returnDuration: 2,
	returnEase: 'elastic.out(1,0.4)',

	maxOffset: 40,
	maxScale: 1.1,
	minScale: 0.9,
	opacityWhileMoving: 0.6,

	activeThreshold: 0.01,

	maxDx: 15,
	maxDy: 15,
	maxDs: 0.1,
}

export function useInertiaUI(zoom: ReturnType<typeof useZoom3D>) {
	const offsetX = ref(0)
	const offsetY = ref(0)
	const scaleEffect = ref(1)
	const opacityEffect = ref(1)

	const uiElements = ref<HTMLElement[]>([])

	const elementCoefficients = new Map<HTMLElement, number>()
	function setElementCoefficient(el: HTMLElement, coeff: number) {
		elementCoefficients.set(el, coeff)
	}

	onMounted(() => {
		void nextTick(() => {
			uiElements.value = Array.from(document.querySelectorAll('.floating-inertia-ui'))
			uiElements.value.forEach((el, i) => {
				setElementCoefficient(el, 0.2 + i * 0.1)
				el.style.willChange = 'transform, opacity'
			})
		})
	})

	let panReturnTimeoutID: number | null = null
	let zoomReturnTimeoutID: number | null = null

	const animOffsetX = { value: offsetX.value }
	const animOffsetY = { value: offsetY.value }
	const animScale = { value: scaleEffect.value }
	const animOpacity = { value: opacityEffect.value }

	watch(
		() => [zoom.offset.value.x, zoom.offset.value.y, zoom.scale.value],
		(newValues, oldValues = [0, 0, 1]) => {
			cancelAllAnimations()
			if (zoom.isResetting.value) {
				animateReturn()
				return
			}

			const [newX, newY, newScale] = newValues
			const [oldX, oldY, oldScale] = oldValues

			const rawDx = newX - oldX
			const rawDy = -newY - -oldY
			const rawDs = (newScale - oldScale) / oldScale

			const scaleForDelta = clamp(newScale, 0.5, 1.5)
			const normDx = rawDx * scaleForDelta
			const normDy = rawDy * scaleForDelta

			const dx = Math.max(-CONFIG.maxDx, Math.min(CONFIG.maxDx, normDx))
			const dy = Math.max(-CONFIG.maxDy, Math.min(CONFIG.maxDy, normDy))
			const ds = Math.max(-CONFIG.maxDs, Math.min(CONFIG.maxDs, rawDs))

			const isPanActive = Math.abs(dx) > CONFIG.activeThreshold || Math.abs(dy) > CONFIG.activeThreshold
			const isZoomActive = Math.abs(ds) > CONFIG.activeThreshold

			if (isPanActive) {
				animateProperty({
					obj: animOffsetX,
					toValue: -dx * CONFIG.offsetMultiplier,
					duration: 0.5,
					onUpdate: () => {
						animOffsetX.value = clamp(animOffsetX.value, -CONFIG.maxOffset, CONFIG.maxOffset)
						offsetX.value = animOffsetX.value
						updateTransforms.resume()
					},
				})
				animateProperty({
					obj: animOffsetY,
					toValue: -dy * CONFIG.offsetMultiplier,
					duration: 0.5,
					onUpdate: () => {
						animOffsetY.value = clamp(animOffsetY.value, -CONFIG.maxOffset, CONFIG.maxOffset)
						offsetY.value = animOffsetY.value
						updateTransforms.resume()
					},
				})
				animateProperty({
					obj: animOpacity,
					toValue: CONFIG.opacityWhileMoving,
					duration: 0.3,
					onUpdate: () => {
						opacityEffect.value = animOpacity.value
						updateTransforms.resume()
					},
				})

				panReturnTimeoutID = setTimeout(() => {
					animateReturn()
					panReturnTimeoutID = null
				}, CONFIG.returnTimeout)
			}

			if (isZoomActive) {
				const maxStep = 0.05
				let step = rawDs
				if (Math.abs(rawDs) > maxStep) step = Math.sign(rawDs) * maxStep
				const targetScale = scaleEffect.value * (1 + step)
				animateProperty({
					obj: animScale,
					toValue: targetScale,
					duration: 0.5,
					onUpdate: () => {
						animScale.value = clamp(animScale.value, CONFIG.minScale, CONFIG.maxScale)
						scaleEffect.value = animScale.value
						updateTransforms.resume()
					},
				})
				animateProperty({
					obj: animOpacity,
					toValue: CONFIG.opacityWhileMoving,
					duration: 0.3,
					onUpdate: () => {
						opacityEffect.value = animOpacity.value
						updateTransforms.resume()
					},
				})

				zoomReturnTimeoutID = setTimeout(() => {
					animateReturn()
					zoomReturnTimeoutID = null
				}, CONFIG.returnTimeout)
			}

			if (!isPanActive && !isZoomActive && panReturnTimeoutID === null && zoomReturnTimeoutID === null) {
				animateReturn()
			}
		},
		{ immediate: true },
	)

	function animateReturn() {
		animateProperty({
			obj: animOffsetX,
			toValue: 0,
			duration: CONFIG.returnDuration,
			ease: CONFIG.returnEase,
			onUpdate: () => {
				offsetX.value = animOffsetX.value
				updateTransforms.resume()
			},
		})
		animateProperty({
			obj: animOffsetY,
			toValue: 0,
			duration: CONFIG.returnDuration,
			ease: CONFIG.returnEase,
			onUpdate: () => {
				offsetY.value = animOffsetY.value
				updateTransforms.resume()
			},
		})
		animateProperty({
			obj: animScale,
			toValue: 1,
			duration: CONFIG.returnDuration * 0.75,
			ease: CONFIG.returnEase,
			onUpdate: () => {
				scaleEffect.value = animScale.value
				updateTransforms.resume()
			},
		})
		animateProperty({
			obj: animOpacity,
			toValue: 1,
			duration: CONFIG.returnDuration * 0.75,
			onUpdate: () => {
				opacityEffect.value = animOpacity.value
				updateTransforms.resume()
			},
		})
	}

	function cancelAllAnimations() {
		gsap.killTweensOf(animOffsetX)
		gsap.killTweensOf(animOffsetY)
		gsap.killTweensOf(animScale)
		gsap.killTweensOf(animOpacity)

		if (panReturnTimeoutID !== null) {
			clearTimeout(panReturnTimeoutID)
			panReturnTimeoutID = null
		}
		if (zoomReturnTimeoutID !== null) {
			clearTimeout(zoomReturnTimeoutID)
			zoomReturnTimeoutID = null
		}
	}

	function animateProperty({
		obj,
		toValue,
		duration = 0.5,
		ease = 'power1.out',
		onUpdate,
	}: {
		obj: { value: number }
		toValue: number
		duration?: number
		ease?: string
		onUpdate: () => void
	}) {
		gsap.killTweensOf(obj)
		return gsap.to(obj, {
			value: toValue,
			duration,
			ease,
			onUpdate,
		})
	}

	const updateTransforms = useRafFn(() => {
		uiElements.value.forEach((el) => {
			const coeff = elementCoefficients.get(el) ?? 1
			const x = offsetX.value * coeff
			const y = offsetY.value * coeff
			const scale = scaleEffect.value
			const opacity = opacityEffect.value.toString()
			el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`
			el.style.opacity = opacity
		})
	})

	return {
		offsetX,
		offsetY,
		scaleEffect,
		opacityEffect,
	}
}
