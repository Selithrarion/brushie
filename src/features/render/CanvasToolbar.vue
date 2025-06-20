<template>
	<div
		class="fixed top-4 left-1/2 z-10 flex -translate-x-1/2 justify-center rounded-lg border-white/30 bg-white/20 p-4 shadow-lg backdrop-blur-md"
	>
		<div class="flex gap-2">
			<UiButton
				v-for="item in tools"
				:key="item.name"
				:class="[
					'flex h-10 w-10 items-center justify-center rounded-md shadow-none transition',
					selected === item.name ? '!bg-pink-300/50' : '',
				]"
				@click="handleToolClick(item)"
			>
				<component :is="item.icon" class="h-5 w-5 text-gray-900/90" />
			</UiButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { Tool } from '@/features/render/types/Tool.ts'
import UiButton from '@/shared/ui/UiButton.vue'

const props = defineProps<{ modelValue: string; tools: Tool[] }>()
const emit = defineEmits<{
	(e: 'update:modelValue', value: string): void
	(e: 'action', name: string): void
}>()

const selected = computed({
	get: () => props.modelValue,
	set: (val: string) => emit('update:modelValue', val),
})

function handleToolClick(tool: Tool) {
	if (tool.mode === 'button') emit('action', tool.name)
	else select(tool)
}
function select(item: Tool) {
	if (selected.value === item.name) return
	selected.value = item.name
}
</script>
