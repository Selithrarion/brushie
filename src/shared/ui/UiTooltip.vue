<template>
	<div v-bind="$attrs" ref="referenceRef" class="inline-block" @mouseenter="open" @mouseleave="close">
		<slot />
	</div>

	<transition appear name="fade-slide">
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
import { ref, onMounted, computed, type CSSProperties, watch, useTemplateRef } from 'vue'

const props = defineProps<{
	text?: string
	placement?: Placement
	disabled?: boolean
	delay?: number
}>()

const referenceRef = useTemplateRef('referenceRef')
const floatingRef = useTemplateRef('floatingRef')
defineExpose({
	referenceRef,
	floatingRef,
	get $el() {
		return referenceRef.value
	},
})

const isOpen = ref(false)

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
		if (props.disabled) close()
	},
)

const openTimeoutID = ref<number | null>(null)
function open() {
	if (props.delay && props.delay > 0) {
		openTimeoutID.value = setTimeout(() => {
			isOpen.value = true
			openTimeoutID.value = null
		}, props.delay)
	} else isOpen.value = true
}
function close() {
	if (openTimeoutID.value !== null) {
		clearTimeout(openTimeoutID.value)
		openTimeoutID.value = null
	}
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
</style>
