<template>
	<teleport to="body">
		<transition name="scale-fade">
			<div
				v-if="visible"
				ref="menuRef"
				class="ui-menu absolute z-[1000] max-w-xs rounded-lg border border-white/30 bg-white/30 py-1 shadow-lg backdrop-blur-lg focus:outline-none"
				role="menu"
				:style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
				tabindex="0"
				@click.stop
				@keydown.stop.prevent="onKeydown"
			>
				<ul class="outline-none" @mouseleave="() => (activeIndex = null)">
					<li
						v-for="(item, idx) in items"
						:key="item.label + idx"
						class="cursor-pointer rounded px-3 py-1 text-sm transition-colors hover:bg-white/50 focus:bg-white/50"
						:class="{ 'bg-white/50': idx === activeIndex }"
						role="menuitem"
						tabindex="-1"
						@click="select(item)"
						@mouseenter="() => (activeIndex = idx)"
					>
						{{ item.label }}
					</li>
				</ul>
			</div>
		</transition>
	</teleport>
</template>

<script setup lang="ts">
import { computePosition, offset, flip, shift, autoUpdate } from '@floating-ui/dom'
import { onClickOutside } from '@vueuse/core'
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

import type { MenuItem } from '@/shared/ui/menu/types.ts'

const props = defineProps<{
	referenceEl?: HTMLElement | null
	visible: boolean
	x?: number
	y?: number
	items: MenuItem[]
	onClose: () => void
}>()

const menuRef = ref<HTMLElement | null>(null)
const pos = ref({ x: 0, y: 0 })
let cleanupAuto: (() => void) | null = null
const activeIndex = ref<number | null>(null)

async function computeAndUpdate() {
	if (!menuRef.value) return
	const source = props.referenceEl || {
		getBoundingClientRect: () => new DOMRect(props.x || 0, props.y || 0, 0, 0),
	}
	const { x, y } = await computePosition(source, menuRef.value, {
		middleware: [offset(8), flip(), shift({ padding: 8 })],
	})
	pos.value = { x, y }
}

function handleOpen() {
	activeIndex.value = null
	if (!props.referenceEl && props.x != null && props.y != null) {
		pos.value = { x: props.x, y: props.y }
	}

	nextTick(() => {
		computeAndUpdate()

		if (props.referenceEl && menuRef.value) {
			cleanupAuto = autoUpdate(props.referenceEl, menuRef.value, computeAndUpdate)
		} else {
			window.addEventListener('scroll', computeAndUpdate, true)
			window.addEventListener('resize', computeAndUpdate)
		}

		menuRef.value?.focus()
	})
}

function handleClose() {
	cleanupAuto?.()
	cleanupAuto = null
	window.removeEventListener('scroll', computeAndUpdate, true)
	window.removeEventListener('resize', computeAndUpdate)
	window.removeEventListener('resize', props.onClose)
	window.removeEventListener('scroll', props.onClose, true)
}

watch(
	() => props.visible,
	(visible) => {
		if (visible) {
			handleOpen()
		} else {
			handleClose()
		}
	},
)

onClickOutside(menuRef, () => {
	if (props.visible) props.onClose()
})

function select(item: MenuItem) {
	try {
		item.action()
	} catch (e) {
		console.error('Menu action error:', e)
	}
	props.onClose()
}

function onKeydown(event: KeyboardEvent) {
	const len = props.items.length
	if (!len) return
	if (event.key === 'ArrowDown') {
		activeIndex.value = activeIndex.value === null ? 0 : (activeIndex.value + 1) % len
	} else if (event.key === 'ArrowUp') {
		activeIndex.value = activeIndex.value === null ? len - 1 : (activeIndex.value - 1 + len) % len
	} else if (event.key === 'Enter') {
		if (activeIndex.value != null) {
			const item = props.items[activeIndex.value]
			if (item) select(item)
		}
	} else if (event.key === 'Escape') {
		props.onClose()
	}
}

onBeforeUnmount(() => {
	handleClose()
})
</script>

<style>
.ui-menu:focus {
	outline: none;
}

.scale-fade-enter-active {
	transition:
		opacity 0.15s ease,
		transform 0.15s ease;
}
.scale-fade-leave-active {
	transition:
		opacity 0.15s ease,
		transform 0.15s ease;
}
.scale-fade-enter-from {
	opacity: 0;
	transform: scale(0.92);
}
.scale-fade-enter-to {
	opacity: 1;
	transform: scale(1);
}
.scale-fade-leave-from {
	opacity: 1;
	transform: scale(1);
}
.scale-fade-leave-to {
	opacity: 0;
	transform: scale(0.95);
}
</style>
