<template>
	<div ref="referenceRef" class="inline-block" @mouseenter="open()" @mouseleave="close()">
		<slot />
	</div>

	<transition appear name="fade-scale">
		<div
			v-if="isOpen && (text || $slots.content)"
			ref="floatingRef"
			class="ui-tooltip z-50 scale-95 rounded-xl bg-white px-2 py-1.5 text-sm whitespace-nowrap text-gray-600 shadow-xl backdrop-blur-md transition-transform select-none hover:scale-100"
			role="tooltip"
			:style="computedStyle"
		>
			<slot name="content">{{ text }}</slot>
		</div>
	</transition>
</template>

<script setup lang="ts">
import { useFloating, offset, shift, flip, autoUpdate, type Placement } from '@floating-ui/vue'
import { ref, onMounted, computed, type CSSProperties, watch } from 'vue'

const props = defineProps<{
	text?: string
	placement?: Placement
	disabled?: boolean
}>()

const isOpen = ref(false)
const referenceRef = ref(null)
const floatingRef = ref(null)

const { x, y, strategy, update } = useFloating(referenceRef, floatingRef, {
	placement: props.placement || 'top',
	middleware: [offset(12), shift(), flip()],
})

onMounted(() => {
	if (referenceRef.value && floatingRef.value) {
		autoUpdate(referenceRef.value, floatingRef.value, update)
	}
})

watch(
	() => props.disabled,
	() => {
		console.log('dsiabled')
		if (props.disabled) close()
	},
)

const open = () => {
	isOpen.value = true
}
const close = () => {
	isOpen.value = false
}

const computedStyle = computed<CSSProperties>(() => ({
	position: strategy.value,
	top: (y.value ?? 0) + 'px',
	left: (x.value ?? 0) + 'px',
	pointerEvents: isOpen.value ? 'auto' : 'none',
}))
</script>

<style scoped>
.ui-tooltip {
	will-change: transform;
	backface-visibility: hidden;
	transform-style: preserve-3d;
}

.fade-scale-enter-active,
.fade-scale-leave-active {
	transition:
		opacity 0.2s ease,
		transform 0.2s ease;
	transform-origin: top center;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
	opacity: 0;
	transform: translateY(10px);
}
.fade-scale-enter-to,
.fade-scale-leave-from {
	opacity: 1;
	transform: translateY(0);
}
</style>
