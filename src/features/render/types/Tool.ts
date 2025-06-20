import type { Component } from 'vue'

export interface Tool {
	name: string
	icon: Component
	mode?: 'button' | 'toggle'
}
