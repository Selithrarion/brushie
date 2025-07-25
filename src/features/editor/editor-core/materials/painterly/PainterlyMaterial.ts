import * as THREE from 'three'

import type { PositionXY } from '@/shared/types/PositionXY.ts'
import { generateShiftedColors } from '@/shared/utils/colors.ts'

import fragment from './fragment.glsl'
import vertex from './vertex.glsl'

const MAX_BRUSHES = 50

export default class PainterlyMaterial extends THREE.ShaderMaterial {
	brushPositions: Float32Array
	brushScales: Float32Array
	brushOpacities: Float32Array
	brushAngles: Float32Array
	brushCount: number

	constructor(options: {
		baseColor: THREE.Color
		brushTexture: THREE.Texture
		paperTexture: THREE.Texture
		brushCount?: number
		enableJelly?: boolean
	}) {
		const { baseColor = new THREE.Color(0xffffff), brushTexture, paperTexture, brushCount = 10, enableJelly = false } = options

		const brushPositions = new Float32Array(MAX_BRUSHES * 2)
		const brushScales = new Float32Array(MAX_BRUSHES)
		const brushOpacities = new Float32Array(MAX_BRUSHES)
		const brushAngles = new Float32Array(MAX_BRUSHES)

		for (let i = 0; i < brushCount; i++) {
			const t = i / brushCount
			const angle = t * Math.PI * 5 + Math.random() * 0.3 * t
			const radius = t * 0.5 + Math.random() * 0.05 * (1.0 - t)
			const jitterX = (Math.random() - 0.5) * 0.05 * t
			const jitterY = (Math.random() - 0.5) * 0.05 * t
			const posX = 0.5 + Math.cos(angle) * radius + jitterX
			const posY = 0.5 + Math.sin(angle) * radius + jitterY
			brushPositions[i * 2] = posX
			brushPositions[i * 2 + 1] = posY
			brushScales[i] = 0.2 + Math.random() * 0.3 + i * 0.12
			brushOpacities[i] = 1.0
			brushAngles[i] = Math.random() * Math.PI * 2.0
		}

		const brushBaseColors = generateShiftedColors(baseColor, brushCount)

		super({
			defines: {
				MAX_BRUSHES: MAX_BRUSHES.toString(),
			},

			uniforms: {
				brushTexture: { value: brushTexture },
				paperTexture: { value: paperTexture },

				uBrushCount: { value: brushCount },
				uBrushPositions: { value: brushPositions },
				uBrushScales: { value: brushScales },
				uBrushOpacities: { value: brushOpacities },
				uBrushBaseColors: { value: brushBaseColors },
				uBrushAngles: { value: brushAngles },
				uIsLocked: { value: false },
				uColorShiftAmount: { value: 0.0 },

				uEnableJelly: { value: enableJelly },
				uCornerRadius: { value: 0.0 },
				uVelocity: { value: new THREE.Vector2(0.0, 0.0) },
				uRotation: { value: 0.0 },

				uGlobalOpacity: { value: 1.0 },

				uDropProgress: { value: 0 },
				uDropFadeOut: { value: 1 },
				uDropColor: { value: new THREE.Color(0xffffff) },
				uDropRadius: { value: 0.35 },
			},
			vertexShader: vertex,
			fragmentShader: fragment,
			transparent: true,
			depthWrite: false,
		})

		this.brushPositions = brushPositions
		this.brushScales = brushScales
		this.brushOpacities = brushOpacities
		this.brushAngles = brushAngles
		this.brushCount = brushCount
	}

	setBrushesFromPencil(points: PositionXY[]) {
		let totalLength = 0
		for (let i = 1; i < points.length; i++) {
			totalLength += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
		}
		const segments = Math.min(Math.ceil(totalLength / 20), 50)
		this.brushCount = segments
		this.uniforms.uBrushCount.value = segments

		for (let i = 0; i < segments; i++) {
			const t = (i / (segments - 1)) * totalLength
			let seg = 1
			let dist = 0
			while (seg < points.length && dist + Math.hypot(points[seg].x - points[seg - 1].x, points[seg].y - points[seg - 1].y) < t) {
				dist += Math.hypot(points[seg].x - points[seg - 1].x, points[seg].y - points[seg - 1].y)
				seg++
			}
			if (seg >= points.length) seg = points.length - 1

			const segStart = points[seg - 1]
			const segEnd = points[seg]
			const segLen = Math.hypot(segEnd.x - segStart.x, segEnd.y - segStart.y)
			const localT = (t - dist) / (segLen || 1)

			const px = segStart.x + (segEnd.x - segStart.x) * localT
			const py = segStart.y + (segEnd.y - segStart.y) * localT

			const angle = Math.atan2(segEnd.y - segStart.y, segEnd.x - segStart.x)

			this.brushPositions[i * 2] = px + (Math.random() - 0.5) * 5
			this.brushPositions[i * 2 + 1] = py + (Math.random() - 0.5) * 5
			this.brushScales[i] = 0.5 + Math.random() * 0.3
			this.brushAngles[i] = angle + (Math.random() - 0.5) * 0.3
			this.brushOpacities[i] = 1
		}
	}
}
