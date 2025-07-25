import * as THREE from 'three'

import type { ShapeType } from '@/features/editor/types/shape.types.ts'

export interface MeshUserData {
	id: string
	color: string
	shapeType: ShapeType
	isLocked?: boolean
}

interface Uniforms {
	uIsLocked?: {
		value: boolean
	}
	uVelocity?: {
		value: THREE.Vector2
	}
	uCornerRadius?: {
		value: number
	}
	uGlobalOpacity?: {
		value: number
	}
}
export type PainterlyMaterialType = THREE.ShaderMaterial & { uniforms: Uniforms }
