import * as THREE from 'three'

import { useParticleSystem } from '@/features/editor/editor-core/hooks/useParticleSystem.ts'
import { useGameMode } from '@/features/editor/editor-game/useGameMode.ts'
import { usePainterlyInteractions } from '@/features/editor/editor-game/usePainterlyInteractions.ts'
import type { useShapeCore } from '@/features/editor/editor-shapes/hooks/useShapeCore.ts'
import { useShapeSelection } from '@/features/editor/editor-shapes/hooks/useShapeSelection.ts'
import { type Shape, ShapeType } from '@/features/editor/types/shape.types.ts'

interface Deps {
	particleSystem: ReturnType<typeof useParticleSystem>
	shapeCore: ReturnType<typeof useShapeCore>
	meshes: Map<string, THREE.Object3D>
	selection: ReturnType<typeof useShapeSelection>
}

export function useGameLayer({ particleSystem, shapeCore, meshes, selection }: Deps) {
	const gameMode = useGameMode()
	const painterlyInteractions = usePainterlyInteractions({
		particleSystem,
		shapeCore,
		meshes,
		onShapeDeleted: () => selection.clear(),
	})

	function tryGameInteraction(shape?: Shape | null) {
		const isGameShape = shape && (shape.type === ShapeType.RECT || shape.type === ShapeType.ELLIPSE)
		if (gameMode.isGameMode.value && isGameShape) {
			painterlyInteractions.handleClick(shape.id)
			return true
		}
		return false
	}

	return {
		gameMode,
		painterlyInteractions,
		tryGameInteraction,
	}
}
