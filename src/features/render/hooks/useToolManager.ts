import { Move, Square, Circle, Slash, Trash2, MoveUpRight, Pencil, MousePointer2 } from 'lucide-vue-next'
import { ref } from 'vue'

import { type Tool, ToolName } from '@/features/render/types/Tool.ts'

export function useToolManager() {
	const selectedTool = ref<ToolName>(ToolName.SELECT)

	const tools: Tool[] = [
		{ name: ToolName.HAND, icon: Move, shortcut: 'h', title: 'Hand — H' },
		{ name: ToolName.SELECT, icon: MousePointer2, shortcut: 'v', altShortcut: '1', title: 'Selection — V or 1' },
		{ name: ToolName.RECT, icon: Square, shortcut: 'r', altShortcut: '2', title: 'Rectangle — R or 2' },
		{ name: ToolName.ELLIPSE, icon: Circle, shortcut: 'o', altShortcut: '3', title: 'Ellipse — O or 3' },
		{ name: ToolName.LINE, icon: Slash, shortcut: 'l', altShortcut: '4', title: 'Line — L or 4' },
		{ name: ToolName.ARROW, icon: MoveUpRight, shortcut: 'a', altShortcut: '5', title: 'Arrow — A or 5' },
		{ name: ToolName.PENCIL, icon: Pencil, shortcut: 'p', altShortcut: '6', title: 'Draw — P or 6' },
		{ name: ToolName.DELETE, icon: Trash2, shortcut: 'e', altShortcut: '0', title: 'Eraser — E or 0' },
		// { name: ToolName.TEXT', icon: , shortcut: 't', altShortcut: '8' },
		// { name: ToolName.IMAGE, icon: , altShortcut: '9' },
		// { name: ToolName.ERASER, icon: , shortcut: 'e', altShortcut: '0' },
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
