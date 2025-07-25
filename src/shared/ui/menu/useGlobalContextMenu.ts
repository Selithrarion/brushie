import { computed, nextTick, ref } from 'vue'

import type { MenuItem } from '@/shared/ui/menu/types.ts'

const openedMenu = ref<string | null>('')
const x = ref<number | undefined>(undefined)
const y = ref<number | undefined>(undefined)
const referenceEl = ref<HTMLElement | null>(null)

const stack = ref<MenuItem[][]>([])
const stackLength = computed(() => stack.value.length)
const currentStackItems = computed(() => stack.value.at(-1) || [])

function pushStack(itemsSet: MenuItem[]) {
	stack.value.push(itemsSet)
}
function popStack() {
	if (stack.value.length > 1) stack.value.pop()
}
function setStack(itemsSet: MenuItem[] | null) {
	stack.value = itemsSet ? [itemsSet] : []
}

function openAtPosition(name: string, screenX: number, screenY: number, menuItems: MenuItem[]) {
	openedMenu.value = null
	void nextTick(() => {
		referenceEl.value = null
		x.value = screenX
		y.value = screenY
		setStack(menuItems)
		void nextTick(() => (openedMenu.value = name))
	})
}

function openAtElement(name: string, el: HTMLElement, menuItems: MenuItem[]) {
	openedMenu.value = null
	void nextTick(() => {
		referenceEl.value = el
		x.value = undefined
		y.value = undefined
		setStack(menuItems)
		void nextTick(() => (openedMenu.value = name))
	})
}

function close() {
	openedMenu.value = null
	setStack(null)
}

export function useGlobalContextMenu() {
	return {
		openedMenu,
		x,
		y,
		items: currentStackItems,
		referenceEl,
		openAtPosition,
		openAtElement,
		close,
		pushStack,
		popStack,
		stackLength,
	}
}
