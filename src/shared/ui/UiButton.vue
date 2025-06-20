<template>
	<button
		v-bind="$attrs"
		:class="[
			baseClasses,
			sizeClasses,
			variantClasses,
			props.disabled || props.loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
		]"
		:disabled="props.disabled || props.loading"
		@click="$emit('click', $event)"
	>
		<span v-if="$slots.icon" :class="['inline-flex items-center', iconWrapperClass]">
			<slot name="icon" />
		</span>

		<span class="relative inline-flex flex-1 items-center justify-center">
			<span :class="props.loading ? 'invisible' : ''">
				<slot />
			</span>

			<template v-if="props.loading">
				<LoaderCircle class="absolute h-5 w-5 animate-spin" :style="`color: ${loaderColor}`" />
			</template>
		</span>

		<span v-if="$slots.append" :class="['inline-flex items-center', iconWrapperClass]">
			<slot name="append" />
		</span>

		<span class="pointer-events-none absolute inset-0">
			<span class="absolute top-0 left-0 h-1/2 w-full bg-gradient-to-b from-white/40 to-transparent opacity-50 blur-md"></span>
		</span>
	</button>
</template>

<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'
import { computed } from 'vue'
const props = defineProps<{
	variant?: 'primary' | 'secondary'
	size?: 'sm' | 'md' | 'lg'
	disabled?: boolean
	loading?: boolean
}>()
const baseClasses =
	'rounded-lg font-medium transition focus:outline-none relative backdrop-blur-md bg-white/20 border border-white/30 shadow-lg active:scale-95'
const sizeClasses = computed(() => {
	if (props.size === 'sm') return 'px-3 py-1.5 text-sm'
	if (props.size === 'lg') return 'px-6 py-3 text-lg'
	return 'px-4 py-2 text-base'
})
const text = 'text-slate-700/90 hover:text-slate-800/90 active:text-slate-800/90'
const primaryBg = 'bg-pink-200/50'
const primaryHover = 'hover:bg-pink-300/20'
const primaryActive = 'active:bg-pink-300/40'
const secondaryBg = 'bg-purple-200/50'
const secondaryHover = 'hover:bg-purple-300/50 '
const secondaryActive = 'active:bg-purple-300/70'
const variantClasses = computed(() => {
	const disabledOrLoading = props.disabled || props.loading
	if (props.variant === 'secondary') {
		return [secondaryBg, !disabledOrLoading ? secondaryHover : '', secondaryActive, text].filter(Boolean).join(' ')
	}
	return [primaryBg, !disabledOrLoading ? primaryHover : '', primaryActive, text].filter(Boolean).join(' ')
})
const loaderColor = '#4B5563'
const iconWrapperClass = computed(() => (props.size === 'sm' ? 'mr-2' : 'mr-3'))
</script>

<style>
button {
	display: inline-flex;
	align-items: center;
	overflow: hidden;
}
</style>
