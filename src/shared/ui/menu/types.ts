import type { Component } from 'vue'

export type MenuItem = {
	label: string
	action: (item?: MenuItem) => void
	icon?: Component
	color?: string
	background?: string
	textColor?: string
	closeOnSelect?: boolean
	disabled?: boolean
	meta?: Record<string, unknown>
}
