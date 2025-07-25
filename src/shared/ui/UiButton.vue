<template>
	<UiTooltip
		ref="rootRef"
		v-bind="$attrs"
		:delay="tooltipDelay"
		:disabled="tooltipDisabled"
		:placement="tooltipPlacement"
		:text="tooltip"
	>
		<button
			:class="[
				baseClasses,
				transition,
				sizeClasses,
				variantClasses,
				props.disabled || props.loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
				buttonClass,
				glow && 'glow',
			]"
			:disabled="props.disabled || props.loading"
			:style="buttonStyles"
			@click="handleClick"
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
	</UiTooltip>
</template>

<script setup lang="ts">
import type { Placement } from '@floating-ui/vue'
import { LoaderCircle } from 'lucide-vue-next'
import { computed, type CSSProperties, ref, useTemplateRef } from 'vue'

import UiTooltip from '@/shared/ui/UiTooltip.vue'

const props = defineProps<{
	buttonClass?: string | string[]
	buttonStyles?: CSSProperties
	tooltip?: string
	tooltipPlacement?: Placement
	tooltipDelay?: number
	variant?: 'primary' | 'secondary'
	size?: 'sm' | 'md' | 'lg'
	glow?: boolean
	disabled?: boolean
	loading?: boolean
}>()

const rootRef = useTemplateRef('rootRef')
defineExpose({
	rootRef,
	get $el() {
		return rootRef.value?.$el
	},
})

const emit = defineEmits<{
	(e: 'click', $event: MouseEvent): void
}>()
const tooltipDisabled = ref(false)
function handleClick($event: MouseEvent) {
	tooltipDisabled.value = true
	emit('click', $event)
	setTimeout(() => {
		tooltipDisabled.value = false
	}, 100)
}

const base = 'rounded-lg font-medium focus:outline-none relative select-none border border-white/30'
const transition = 'transition duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]'
const glassBase = `${base} backdrop-blur-md bg-white/20 shadow-lg`
const activeClasses = 'transform active:scale-95 active:duration-50 active:ease-in-out'
const baseClasses = computed(() => (props.variant === 'secondary' ? base : glassBase))

const sizeClasses = computed(() => {
	if (props.size === 'sm') return 'px-3 py-1.5 text-sm'
	if (props.size === 'lg') return 'px-6 py-3 text-lg'
	return 'px-4 py-2 text-base'
})

const text = 'text-slate-700/90 hover:text-slate-800/90 active:text-slate-800/90'
const primaryBg = 'bg-pink-200/50'
const primaryHover = 'hover:bg-pink-300/20'
const primaryActive = 'active:bg-pink-300/40'

const secondaryText = 'text-slate-800/90 hover:text-slate-900/90 active:text-slate-900/90'
const secondaryBg = 'bg-slate-200'
const secondaryHover = 'hover:bg-slate-300/80'
const secondaryActive = 'active:bg-slate-300'

const variantClasses = computed(() => {
	const disabledOrLoading = props.disabled || props.loading

	if (props.variant === 'secondary') {
		return [secondaryBg, !disabledOrLoading ? secondaryHover : '', secondaryActive, secondaryText, activeClasses]
			.filter(Boolean)
			.join(' ')
	}

	return [primaryBg, !disabledOrLoading ? primaryHover : '', primaryActive, text, activeClasses].filter(Boolean).join(' ')
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
button:hover {
	transform: scale(1.03) rotate(-2deg);
}

@keyframes dream-glow {
	0% {
		box-shadow: 5px 0 15px rgba(255, 182, 193, 0.7);
	}
	25% {
		box-shadow: 0 5px 20px rgba(255, 192, 203, 0.7);
	}
	50% {
		box-shadow: -5px 0 15px rgba(255, 182, 193, 0.5);
	}
	75% {
		box-shadow: 0 -5px 20px rgba(255, 192, 203, 0.7);
	}
	100% {
		box-shadow: 5px 0 15px rgba(255, 182, 193, 0.7);
	}
}
.glow {
	animation: dream-glow 5s ease-in-out infinite alternate;
}

button::after {
	content: '';
	position: absolute;
	bottom: 0;
	left: 0;
	width: 100%;
	height: 0;
	background: linear-gradient(to top, rgba(255, 182, 193, 0.5), transparent);
	transition: height 0.4s ease;
	pointer-events: none;
	border-radius: inherit;
}
button:active::after {
	height: 100%;
}
</style>
