import type { Component } from 'vue'

export interface Tool {
	name: string
	title: string
	icon: Component
	mode?: 'button' | 'toggle'
	shortcut?: string
	altShortcut?: string
}

export enum ToolName {
	HAND = 'hand',
	SELECT = 'select',
	RECT = 'rect',
	ELLIPSE = 'ellipse',
	LINE = 'line',
	ARROW = 'arrow',
	PENCIL = 'pencil',
	ERASER = 'eraser',
}
