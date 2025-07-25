<template>
	<teleport to="body">
		<div v-show="localVisible" ref="menuRef" class="pointer-events-auto fixed">
			<UiButton
				v-for="(item, index) in localItems"
				:key="item.label + item.icon + index"
				:ref="(c) => trackRef((c as InstanceType<typeof UiButton>)?.$el, index)"
				button-class="!p-3 !rounded-full size-[48px] !backdrop-blur-none bg-white/50"
				:button-styles="{
					color: item.color,
					background: item.background,
				}"
				class="radial-menu-button fixed"
				:disabled="item.disabled"
				:glow="activeIndex === index"
				:style="{
					left: `${localX - centeredOffset}px`,
					top: `${localY - centeredOffset}px`,
				}"
				:tooltip="item.label"
				:tooltip-delay="1000"
				tooltip-placement="right"
				variant="primary"
				@click="() => select(item)"
				@mouseenter="activeIndex = index"
				@mouseleave="activeIndex = null"
			>
				<component :is="item.icon" v-if="item.icon" class="h-4 w-4" />
				<span v-else>{{ item.label }}</span>
			</UiButton>
		</div>
	</teleport>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import gsap from 'gsap'
import { ref, watch, nextTick, useTemplateRef, computed } from 'vue'

import type { PositionXY } from '@/shared/types/PositionXY.ts'
import type { MenuItem } from '@/shared/ui/menu/types.ts'
import UiButton from '@/shared/ui/UiButton.vue'

const props = defineProps<{
	visible: boolean
	x: number
	y: number
	items: MenuItem[]
	onClose: () => void
	centered: boolean
	angleOffset: number
	stackLength: number
}>()

const isHidingAnimation = ref(false)
const localX = ref(props.x)
const localY = ref(props.y)
const localVisible = ref(false)
const localItems = ref<MenuItem[]>([])

const activeIndex = ref<number | null>(null)

const menuRef = useTemplateRef('menuRef')

const buttonEls = ref<HTMLElement[]>([])
function trackRef($el: HTMLElement | null, index: number) {
	if ($el) buttonEls.value[index] = $el
}

const BUTTON_SIZE = 42
const centeredOffset = computed(() => {
	return props.centered ? BUTTON_SIZE / 2 : 0
})

const positions = computed(() => {
	const result: PositionXY[] = []
	const radius = 90

	if (props.centered) {
		const angleStep = (Math.PI * 2) / localItems.value.length
		for (let i = 0; i < localItems.value.length; i++) {
			const angle = i * angleStep
			result.push({
				x: radius * Math.cos(angle),
				y: radius * Math.sin(angle),
			})
		}
	} else {
		const totalAngle = Math.PI
		const startAngle = props.angleOffset
		const angleStep = totalAngle / (localItems.value.length - 1)
		for (let i = 0; i < localItems.value.length; i++) {
			const angle = startAngle + i * angleStep
			result.push({
				x: radius * Math.cos(angle),
				y: radius * Math.sin(angle),
			})
		}
	}

	return result
})

const pendingOpen = ref<{
	x: number
	y: number
	items: MenuItem[]
} | null>(null)
const prevStackLength = ref<number | undefined>(undefined)

async function performOpen(x: number, y: number, items: MenuItem[]) {
	await hideWithAnimation()
	localX.value = x
	localY.value = y
	localItems.value = [...items]
	openWithAnimation()
}

watch(
	() => props.visible,
	(v) => {
		if (v) {
			if (localVisible.value) {
				pendingOpen.value = { x: props.x, y: props.y, items: [...props.items] }
				hideWithAnimation().then(() => {
					const next = pendingOpen.value
					pendingOpen.value = null
					if (next) performOpen(next.x, next.y, next.items)
				})
			} else {
				void performOpen(props.x, props.y, props.items)
			}
		} else {
			void hideWithAnimation()
		}
	},
)

watch(
	() => props.stackLength,
	async (length) => {
		if (!localVisible.value) {
			prevStackLength.value = length
			return
		}

		const isChanged = prevStackLength.value !== length
		prevStackLength.value = length

		if (isChanged) void performOpen(props.x, props.y, props.items)
	},
)

function openWithAnimation() {
	if (hideTween) {
		hideTween.kill()
		hideTween = null
	}
	localVisible.value = true
	nextTick(() => animateOpen())
}
async function animateOpen() {
	const startX = positions.value[0].x
	const startY = positions.value[0].y

	gsap.fromTo(
		buttonEls.value,
		{
			x: startX,
			y: startY,
			opacity: 0,
			scale: 0.5,
		},
		{
			x: (i) => positions.value[i]?.x,
			y: (i) => positions.value[i]?.y,
			opacity: 1,
			scale: 1,
			stagger: 0.02,
			ease: 'back.out(1.3)',
			duration: 0.25,
		},
	)
}

let hideTween: gsap.core.Tween | null = null
function hideWithAnimation(): Promise<void> {
	if (!localVisible.value) return Promise.resolve()

	if (hideTween) {
		hideTween.kill()
		hideTween = null
	}

	return new Promise<void>((resolve) => {
		isHidingAnimation.value = true
		hideTween = gsap.to(buttonEls.value, {
			x: 0,
			y: 0,
			scale: 0.5,
			opacity: 0,
			duration: 0.15,
			ease: 'power2.in',
			stagger: -0.02,
			onComplete: () => {
				localVisible.value = false
				isHidingAnimation.value = false
				hideTween = null
				resolve()
			},
			overwrite: 'auto',
		})
	})
}

useEventListener(window, 'click', handleWindowClick)
useEventListener(window, 'keydown', handleKeydown)

function handleKeydown(event: KeyboardEvent) {
	const len = localItems.value.length
	if (!len) return

	if (event.key === 'ArrowDown') {
		activeIndex.value = activeIndex.value === null ? 0 : (activeIndex.value + 1) % len
	} else if (event.key === 'ArrowUp') {
		activeIndex.value = activeIndex.value === null ? len - 1 : (activeIndex.value - 1 + len) % len
	} else if (event.key === 'Enter') {
		if (activeIndex.value != null) {
			const item = localItems.value[activeIndex.value]
			if (item) select(item)
		}
	} else if (event.key === 'Escape') {
		props.onClose()
	}
}

function handleWindowClick($event: MouseEvent) {
	if ($event.button !== 0) return

	const target = $event.target as HTMLElement
	const clickedInside = menuRef.value?.contains(target) || target.closest('.radial-menu-button')
	if (clickedInside) return

	props.onClose()
}

function select(item: MenuItem) {
	try {
		item.action(item)
	} catch (e) {
		console.error('Menu action error:', e)
	}

	if (item.closeOnSelect || item.closeOnSelect === undefined) props.onClose()
}
</script>
