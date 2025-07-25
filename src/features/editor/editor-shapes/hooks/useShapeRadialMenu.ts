import gsap from 'gsap'
import { ArrowUpFromDotIcon, PaletteIcon, TrashIcon, ArrowLeftIcon } from 'lucide-vue-next'
import * as THREE from 'three'
import { ref, computed } from 'vue'
import type { Ref } from 'vue'

import type { usePointer3DTools } from '@/features/editor/editor-core/hooks/usePointer3DTools.ts'
import type PainterlyMaterial from '@/features/editor/editor-core/materials/painterly/PainterlyMaterial.ts'
import type { useShapeCore } from '@/features/editor/editor-shapes/hooks/useShapeCore.ts'
import { computeBoundingBoxForShape } from '@/features/editor/utils/box.utils.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'
import type { MenuItem } from '@/shared/ui/menu/types.ts'
import { useGlobalContextMenu } from '@/shared/ui/menu/useGlobalContextMenu.ts'
import { generateShiftedColors, pastelPalette } from '@/shared/utils/colors.ts'

const MENU_WIDTH = 100
const GAP = 20

interface Deps {
	renderer: Ref<THREE.WebGLRenderer | null>
	meshes: Map<string, THREE.Object3D>
	shapeCore: ReturnType<typeof useShapeCore>
	pointer3DTools: ReturnType<typeof usePointer3DTools>
	lockedShapeIDs: Ref<Set<string>>
}

export function useShapeRadialMenu(deps: Deps) {
	const menu = useGlobalContextMenu()

	const centered = ref(false)
	const mirrored = ref(false)

	const angleOffset = computed(() => {
		if (centered.value) return 0
		return mirrored.value ? Math.PI / 2 : -Math.PI / 2
	})

	function openForShape(screenPos1: PositionXY, screenPos2: PositionXY, items: MenuItem[], cursorPos: PositionXY) {
		const center = {
			x: (screenPos1.x + screenPos2.x) / 2,
			y: (screenPos1.y + screenPos2.y) / 2,
		}
		const shapeWidth = Math.abs(screenPos2.x - screenPos1.x)

		const rightEnough = center.x + shapeWidth / 2 + MENU_WIDTH < window.innerWidth
		const leftEnough = center.x - shapeWidth / 2 - MENU_WIDTH > 0

		let menuX: number
		let menuY = center.y - 25

		if (rightEnough) {
			menuX = center.x + shapeWidth / 2 + GAP
			centered.value = false
			mirrored.value = false
		} else if (leftEnough) {
			menuX = center.x - shapeWidth / 2 - GAP * 3
			centered.value = false
			mirrored.value = true
		} else {
			menuX = cursorPos.x
			menuY = cursorPos.y
			centered.value = true
			mirrored.value = false
		}

		menu.openAtPosition('shape', menuX, menuY, items)
	}

	function onContextMenu($event: MouseEvent) {
		if (!deps.renderer.value) return

		const pos = { x: $event.clientX, y: $event.clientY }
		deps.pointer3DTools.setPointerNDC(pos)
		const worldPos = deps.pointer3DTools.screenToWorld(pos)

		const shape = deps.shapeCore.findShapeAtPos3D(worldPos)
		const isLocked = shape && deps.lockedShapeIDs.value.has(shape.id)
		if (isLocked) return

		if (shape) {
			const bbox = computeBoundingBoxForShape(shape)
			const screenPos1 = deps.pointer3DTools.worldToScreen({ x: bbox.x1, y: bbox.y1 })
			const screenPos2 = deps.pointer3DTools.worldToScreen({ x: bbox.x2, y: bbox.y2 })

			const cursorPos = { x: $event.clientX, y: $event.clientY }

			const COLOR_ITEMS: MenuItem[] = [
				{
					label: 'Back',
					icon: ArrowLeftIcon,
					action: () => menu.popStack(),
					closeOnSelect: false,
				},
				...pastelPalette.map((color) => ({
					label: '',
					action: (item?: MenuItem) => {
						const shapeID = item?.meta?.shapeID as string
						if (shapeID) paintShape(shapeID, color)
						menu.popStack()
					},
					background: color,
					color: '#000',
					meta: { shapeID: shape.id },
					closeOnSelect: false,
				})),
			]
			const MENU_ITEMS: MenuItem[] = [
				{
					label: 'Upgrade',
					action: () => console.log('upgrade'),
					icon: ArrowUpFromDotIcon,
					color: '#0ea5e9',
					disabled: true,
				},
				{
					label: 'Color',
					action: () => menu.pushStack(COLOR_ITEMS),
					icon: PaletteIcon,
					color: '#facc15',
					closeOnSelect: false,
				},
				{
					label: 'Delete',
					action: () => deps.shapeCore.remove(shape.id),
					icon: TrashIcon,
					color: '#f87171',
				},
				{
					label: 'Delete',
					action: () => deps.shapeCore.remove(shape.id),
					icon: TrashIcon,
					color: '#f87171',
					disabled: true,
				},
			]

			openForShape(screenPos1, screenPos2, MENU_ITEMS, cursorPos)
		}
	}

	function paintShape(id: string, color: string) {
		const mesh = deps.meshes.get(id) as THREE.Mesh
		if (!mesh) return

		const mat = mesh.material as PainterlyMaterial

		const base = new THREE.Color(color)
		const shifted = generateShiftedColors(base, mat.brushCount)

		mat.uniforms.uDropColor.value.set(base)
		mat.uniforms.uDropProgress.value = 0
		mat.uniforms.uDropFadeOut.value = 1

		gsap.to(mat.uniforms.uDropProgress, {
			value: 1,
			duration: 0.3,
			onComplete: () => {
				mat.uniforms.uBrushBaseColors.value.set(shifted)
				gsap.to(mat.uniforms.uDropFadeOut, {
					value: 0,
					duration: 0.5,
					onComplete: () => {
						mat.uniforms.uDropProgress.value = 0
						mat.uniforms.uDropFadeOut.value = 1
						mat.uniforms.uDropColor.value.set(new THREE.Color(0, 0, 0))
					},
				})
			},
		})
	}

	return {
		...menu,
		centered,
		mirrored,
		angleOffset,
		openForShape,
		onContextMenu,
	}
}
