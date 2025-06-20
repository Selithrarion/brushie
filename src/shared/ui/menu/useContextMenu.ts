import { nextTick, ref } from 'vue'

import type { MenuItem } from '@/shared/ui/menu/types.ts'

export function useContextMenu() {
	const visible = ref(false)
	const x = ref<number | undefined>(undefined)
	const y = ref<number | undefined>(undefined)
	const items = ref<MenuItem[]>([])
	const referenceEl = ref<HTMLElement | null>(null)

	function openAtPosition(px: number, py: number, menuItems: MenuItem[]) {
		visible.value = false
		void nextTick(() => {
			referenceEl.value = null
			x.value = px
			y.value = py
			items.value = menuItems
			visible.value = true
		})
	}

	function openAtElement(el: HTMLElement, menuItems: MenuItem[]) {
		visible.value = false
		void nextTick(() => {
			referenceEl.value = el
			x.value = undefined
			y.value = undefined
			items.value = menuItems
			visible.value = true
		})
	}

	function close() {
		visible.value = false
	}

	return { visible, x, y, items, referenceEl, openAtPosition, openAtElement, close }
}
