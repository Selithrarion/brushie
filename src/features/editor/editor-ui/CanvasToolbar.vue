<template>
	<div class="fixed top-4 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center justify-center">
		<div class="floating-inertia-ui flex w-fit gap-2 rounded-lg border-white/30 bg-white/20 p-4 shadow-lg backdrop-blur-md">
			<UiButton
				v-for="item in tools"
				:key="item.name"
				:button-class="[
					'relative flex h-10 w-10 items-center justify-center rounded-md shadow-none transition',
					selected === item.name ? '!cursor-default !bg-pink-300/50' : '',
				]"
				:glow="selected === item.name"
				:tooltip="item.title"
				@click="handleToolClick(item)"
			>
				<component :is="item.icon" class="h-5 w-5 text-gray-900/90" />
				<span v-if="item.altShortcut" class="absolute right-[-6px] bottom-[-10px] text-[10px] text-gray-400">
					{{ item.altShortcut }}
				</span>
			</UiButton>
		</div>

		<div v-if="selected !== ToolName.HAND" class="mt-2 text-center text-xs text-gray-500 select-none">
			<div v-if="selected === ToolName.SELECT">hold mouse wheel or spacebar while dragging, or use the hand tool</div>
			<div v-else-if="selected === ToolName.LINE || selected === ToolName.ARROW || selected === ToolName.PENCIL">
				press ESC to cancel drawing
			</div>
			<!--			<div v-else-if="selected === ToolName.TEXT">Click on canvas to place text</div>-->
		</div>
	</div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { computed } from 'vue'

import { type Tool, ToolName } from '@/features/editor/types/tool.types.ts'
import UiButton from '@/shared/ui/UiButton.vue'

const props = defineProps<{ modelValue: string; tools: Tool[] }>()
const emit = defineEmits<{
	(e: 'update:modelValue', value: string): void
	(e: 'action', name: string): void
}>()

useEventListener(window, 'keydown', handleKeydown)
function handleKeydown($event: KeyboardEvent) {
	const isMac = navigator.userAgent.includes('Mac')
	const ctrlPressed = isMac ? $event.metaKey : $event.ctrlKey
	const anyModifier = ctrlPressed || $event.altKey || $event.shiftKey
	if (anyModifier) return

	const pressed = $event.key.toLowerCase()
	const match = props.tools.find((tool) => tool.shortcut?.toLowerCase() === pressed || tool.altShortcut?.toLowerCase() === pressed)

	if (match) {
		$event.preventDefault()
		select(match)
	}
}
const selected = computed({
	get: () => props.modelValue,
	set: (val: string) => emit('update:modelValue', val),
})

function handleToolClick(tool: Tool) {
	if (tool.mode === 'button') emit('action', tool.name)
	else select(tool)
}
function select(item: Tool) {
	const isSelectToggle = item.name === ToolName.SELECT && selected.value === ToolName.SELECT
	if (isSelectToggle) {
		selected.value = ToolName.HAND
		return
	}

	if (selected.value === item.name) return
	selected.value = item.name
}
</script>
