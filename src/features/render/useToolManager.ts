import { Move, Square, Circle, Slash, Trash2, ZoomIn, ZoomOut } from 'lucide-vue-next'
import { ref } from 'vue'

import type { Tool } from '@/features/render/types/Tool.ts'

export function useToolManager() {
	const selectedTool = ref<string>('select')

	const tools: Tool[] = [
		{ name: 'select', icon: Move },
		{ name: 'rect', icon: Square },
		{ name: 'ellipse', icon: Circle },
		{ name: 'line', icon: Slash },
		{ name: 'delete', icon: Trash2 },
		{ name: 'zoomIn', icon: ZoomIn, mode: 'button' },
		{ name: 'zoomOut', icon: ZoomOut, mode: 'button' },
	]

	function handleToolbarAction(action: string, handlers: Record<string, () => void>) {
		const handler = handlers[action]
		if (handler) handler()
	}

	return {
		selectedTool,
		tools,
		handleToolbarAction,
	}
}
