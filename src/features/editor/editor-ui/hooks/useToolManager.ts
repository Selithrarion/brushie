import { MoveIcon, SquareIcon, CircleIcon, SlashIcon, EraserIcon, MoveUpRightIcon, PencilIcon, MousePointer2Icon } from 'lucide-vue-next'
import { ref } from 'vue'

import { type Tool, ToolName } from '@/features/editor/types/tool.types.ts'

export function useToolManager() {
	const selectedTool = ref<ToolName>(ToolName.SELECT)

	const tools: Tool[] = [
		{ name: ToolName.HAND, icon: MoveIcon, shortcut: 'h', title: 'Hand — H' },
		{ name: ToolName.SELECT, icon: MousePointer2Icon, shortcut: 'v', altShortcut: '1', title: 'Selection — V or 1' },
		{ name: ToolName.RECT, icon: SquareIcon, shortcut: 'r', altShortcut: '2', title: 'Rectangle — R or 2' },
		{ name: ToolName.ELLIPSE, icon: CircleIcon, shortcut: 'o', altShortcut: '3', title: 'Ellipse — O or 3' },
		{ name: ToolName.LINE, icon: SlashIcon, shortcut: 'l', altShortcut: '4', title: 'Line — L or 4' },
		{ name: ToolName.ARROW, icon: MoveUpRightIcon, shortcut: 'a', altShortcut: '5', title: 'Arrow — A or 5' },
		{ name: ToolName.PENCIL, icon: PencilIcon, shortcut: 'p', altShortcut: '6', title: 'Draw — P or 6' },
		{ name: ToolName.ERASER, icon: EraserIcon, shortcut: 'e', altShortcut: '0', title: 'Eraser — E or 0' },
		// { name: ToolName.TEXT', icon: , shortcut: 't', altShortcut: '8' },
		// { name: ToolName.IMAGE, icon: , altShortcut: '9' },
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
