import { useRafFn } from '@vueuse/core'
import { gsap } from 'gsap'
import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial'
import { onMounted, type Ref, ref, watch } from 'vue'

import { useJellyVelocityAnimation } from '@/features/editor/editor-core/hooks/useJellyVelocityAnimation.ts'
import { useMeshAnimation } from '@/features/editor/editor-core/hooks/useMeshAnimation.ts'
import PainterlyMaterial from '@/features/editor/editor-core/materials/painterly/PainterlyMaterial.ts'
import type { useBoundingBox } from '@/features/editor/editor-shapes/hooks/useBoundingBox.ts'
import type { useShapeSelection } from '@/features/editor/editor-shapes/hooks/useShapeSelection.ts'
import type { useRemoteSelection } from '@/features/editor/edtitor-sync/useRemoteSelection.ts'
import { type Shape, ShapeType } from '@/features/editor/types/shape.types.ts'
import type { MeshUserData } from '@/features/editor/types/three.types.ts'
import { collectMaterialsFromObject, disposeMaterials, isShaderMaterial } from '@/features/editor/utils/three.utils.ts'
import { COLORS } from '@/shared/constants/colors.ts'
import type { PositionXY } from '@/shared/types/PositionXY.ts'

export function useMeshesManager(
	containerRef: Ref<HTMLElement | null>,
	renderer: Ref<THREE.WebGLRenderer | null>,
	scene: Ref<THREE.Scene | null>,
	boundingBox: ReturnType<typeof useBoundingBox>,
	selection: ReturnType<typeof useShapeSelection>,
	remoteSelection: ReturnType<typeof useRemoteSelection>,
	requestDraw: Ref<() => void>,
	meshes: Map<string, THREE.Object3D>,
	lockedShapeIDs: Ref<Set<string>>,
) {
	const meshAnimation = useMeshAnimation(requestDraw, meshes, remove)

	const jelly = useJellyVelocityAnimation()
	const { pause, resume } = useRafFn(
		() => {
			jelly.tick()

			for (const id of selection.selectedShapeIDs.value) {
				const mesh = meshes.get(id)
				if (!mesh || mesh.userData.shapeType !== ShapeType.RECT) continue

				const mat = (mesh as THREE.Mesh).material as PainterlyMaterial
				mat.uniforms.uCornerRadius.value = jelly.cornerRadius.value
				mat.uniforms.uVelocity.value.set(jelly.velocity.value.x, jelly.velocity.value.y)
			}
		},
		{ immediate: false },
	)
	watch(
		() => selection.selectedShapeIDs.value,
		(current, prev) => {
			for (const id of prev) if (!current.includes(id)) resetJellyMesh(id)

			jelly.reset()

			const rectSelected = current.map((id) => meshes.get(id)).filter((m) => m?.userData?.shapeType === ShapeType.RECT)
			if (rectSelected.length === 1) resume()
			else pause()
		},
		{ deep: true },
	)
	watch(
		() => boundingBox.rawBox.value,
		() => {
			const box = boundingBox.rawBox.value
			if (!box) return
			const centerX = (box.x1 + box.x2) / 2
			const centerY = (box.y1 + box.y2) / 2
			jelly.update(centerX, centerY)
		},
		{ deep: true },
	)
	function resetJellyMesh(id: string) {
		const mesh = meshes.get(id)
		if (!mesh || mesh.userData.shapeType !== ShapeType.RECT) return

		const mat = (mesh as THREE.Mesh).material as PainterlyMaterial
		if (mat && isShaderMaterial(mat)) {
			gsap.to(mat.uniforms.uCornerRadius, {
				value: 0,
				duration: 0.2,
			})
			gsap.to(mat.uniforms.uVelocity.value, {
				x: 0,
				y: 0,
				duration: 0.2,
			})
		}
	}

	onMounted(() => {
		loadTextures()
	})

	// TODO: increasing hot reload time ? use cache
	const brushTexture = ref<THREE.Texture | null>(null)
	const paperTexture = ref<THREE.Texture | null>(null)
	function loadTextures() {
		const loader = new THREE.TextureLoader()

		const loadTexture = (url: string) =>
			new Promise<THREE.Texture>((resolve, reject) => {
				loader.load(
					url,
					(texture) => resolve(texture),
					undefined,
					(err) => reject(err),
				)
			})

		const promises = [loadTexture('/brush-stroke-dry.png'), loadTexture('/paper-texture.jpg')]
		Promise.all(promises)
			.then(([brushTex, paperTex]) => {
				brushTex.minFilter = THREE.LinearMipMapLinearFilter
				brushTex.magFilter = THREE.LinearFilter
				brushTex.generateMipmaps = true
				brushTex.wrapS = THREE.ClampToEdgeWrapping
				brushTex.wrapT = THREE.ClampToEdgeWrapping
				brushTex.anisotropy = renderer.value!.capabilities.getMaxAnisotropy()

				paperTex.minFilter = THREE.LinearMipMapLinearFilter
				paperTex.magFilter = THREE.LinearFilter
				paperTex.generateMipmaps = true
				paperTex.wrapS = THREE.RepeatWrapping
				paperTex.wrapT = THREE.RepeatWrapping
				paperTex.repeat.set(3, 3)
				paperTex.anisotropy = renderer.value!.capabilities.getMaxAnisotropy()

				brushTexture.value = brushTex
				paperTexture.value = paperTex
			})
			.catch((err) => {
				console.error('load texture err:', err)
			})
	}

	function create(shape: Shape, options = { skipAnimation: false }) {
		let mesh: THREE.Object3D
		const isDraft = shape.id.includes('draft-')
		const isSkipAnimation = isDraft || options.skipAnimation

		if (shape.type === ShapeType.RECT || shape.type === ShapeType.ELLIPSE) {
			const width = shape.x2 - shape.x1
			const height = shape.y2 - shape.y1

			const geo = shape.type === ShapeType.RECT ? new THREE.PlaneGeometry(1, 1) : new THREE.CircleGeometry(0.5, 32)

			const mat = new PainterlyMaterial({
				baseColor: new THREE.Color(shape.color),
				brushTexture: brushTexture.value!,
				paperTexture: paperTexture.value!,
				enableJelly: shape.type === ShapeType.RECT,
			})

			const m = new THREE.Mesh(geo, mat)

			meshAnimation.animateCreate(m, width, height)
			meshAnimation.animateCreateBrush(mat)

			m.position.set(shape.x1 + width / 2, shape.y1 + height / 2, 0)
			m.rotation.z = shape.rotation || 0
			mesh = m
		} else if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
			const ARROW_SIZE = 6

			const length = Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1)
			const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1)
			const lineWidth = 1
			const lineLengthAdjusted = shape.type === ShapeType.ARROW ? length - ARROW_SIZE * 0.5 : length

			const lineGeo = new THREE.PlaneGeometry(lineLengthAdjusted, lineWidth)
			const lineMat = new PainterlyMaterial({
				baseColor: new THREE.Color(shape.color),
				brushTexture: brushTexture.value!,
				paperTexture: paperTexture.value!,
			})

			const lineMesh = new THREE.Mesh(lineGeo, lineMat)
			lineMesh.position.set(lineLengthAdjusted / 2, 0, 0)

			const group = new THREE.Object3D()
			group.position.set(shape.x1, shape.y1, 0)
			group.rotation.z = angle
			group.add(lineMesh)

			if (shape.type === ShapeType.ARROW) {
				const coneGeo = new THREE.ConeGeometry(ARROW_SIZE * 0.4, ARROW_SIZE, 3)
				const coneMat = new PainterlyMaterial({
					baseColor: new THREE.Color(shape.color),
					brushTexture: brushTexture.value!,
					paperTexture: paperTexture.value!,
				})
				const coneMesh = new THREE.Mesh(coneGeo, coneMat)
				coneMesh.position.set(length - ARROW_SIZE * 0.5, 0, 0)
				coneMesh.rotation.z = -Math.PI / 2
				group.add(coneMesh)

				if (!isSkipAnimation) {
					gsap.to(coneMesh.scale, {
						x: 1.5,
						y: 1.5,
						duration: 0.15,
						yoyo: true,
						repeat: 1,
						onUpdate: () => requestDraw.value(),
					})
				}
			}

			if (!isSkipAnimation) {
				gsap.to(lineMesh.scale, {
					y: 1.5,
					duration: 0.15,
					yoyo: true,
					repeat: 1,
					onUpdate: () => requestDraw.value(),
				})
			}

			mesh = group
		} else if (shape.type === ShapeType.PENCIL) {
			const geo = new LineGeometry()
			geo.setPositions(getPencilPosition(shape.points))

			const mat = new LineMaterial({
				color: new THREE.Color(shape.color),
				linewidth: shape.lineWidth,
				resolution: new THREE.Vector2(containerRef.value!.clientWidth, containerRef.value!.clientHeight),
				transparent: true,
			})

			const line = new Line2(geo, mat)
			line.userData.pointCount = shape.points.length

			mesh = line

			// const group = new THREE.Group()
			// const pts = shape.points
			//
			// for (let i = 0; i < pts.length; i++) {
			// 	const spriteMat = new THREE.SpriteMaterial({
			// 		map: brushTexture.value,
			// 		color: new THREE.Color(shape.color),
			// 	})
			// 	const sprite = new THREE.Sprite(spriteMat)
			//
			// 	sprite.position.set(pts[i].x, pts[i].y, 0)
			// 	const scaleFactor = shape.lineWidth * (0.1 + Math.random() * 0.5)
			// 	sprite.scale.set(scaleFactor, scaleFactor, 1)
			//
			// 	sprite.material.rotation = Math.random() * Math.PI * 2
			//
			// 	group.add(sprite)
			// }
			//
			// mesh = group
		} else {
			return
		}

		const userData: MeshUserData = {
			id: shape.id,
			color: shape.color,
			shapeType: shape.type,
		}
		mesh.userData = userData

		scene.value!.add(mesh)
		meshes.set(shape.id, mesh)
	}
	function getPencilPosition(pts: PositionXY[]): Float32Array {
		const positions = new Float32Array(pts.length * 3)
		for (let i = 0; i < pts.length; i++) {
			positions[i * 3] = pts[i].x
			positions[i * 3 + 1] = pts[i].y
			positions[i * 3 + 2] = 0
		}
		return positions
	}

	function update(shape: Shape) {
		const obj = meshes.get(shape.id)
		if (!obj) return

		if (shape.type === ShapeType.RECT || shape.type === ShapeType.ELLIPSE) {
			const mesh = obj as THREE.Mesh
			const width = shape.x2 - shape.x1
			const height = shape.y2 - shape.y1

			mesh.scale.set(width, height, 1)
			mesh.position.set(shape.x1 + width / 2, shape.y1 + height / 2, 0)
			mesh.rotation.z = shape.rotation || 0

			const mat = mesh.material as PainterlyMaterial
			mat.uniforms.uVelocity.value.set(jelly.velocity.value.x, jelly.velocity.value.y)
			mat.uniforms.uCornerRadius.value = jelly.cornerRadius.value
			mat.uniforms.uRotation.value = mesh.rotation.z
		} else if (shape.type === ShapeType.LINE || shape.type === ShapeType.ARROW) {
			remove(shape.id, obj)
			create(shape, { skipAnimation: true })
		} else if (shape.type === ShapeType.PENCIL) {
			const geo = new LineGeometry()
			geo.setPositions(getPencilPosition(shape.points))

			const line = obj as Line2
			line.geometry.dispose()
			line.geometry = geo

			const mat = line.material as LineMaterial
			mat.color = new THREE.Color(shape.color)
			mat.linewidth = shape.lineWidth

			line.userData.pointCount = shape.points.length
		}
	}

	function removeShapeWithAnimation(id: string, mesh: THREE.Object3D) {
		const type = mesh.userData.shapeType
		if (type === ShapeType.RECT || type === ShapeType.ELLIPSE) meshAnimation.animateRemoveBrush(id, mesh)
		else if (type === ShapeType.LINE || type === ShapeType.ARROW) meshAnimation.animateRemoveFadeGroup(id, mesh)
		else meshAnimation.animateRemoveFade(id, mesh)
	}

	function remove(id: string, obj: THREE.Object3D) {
		if (scene.value) {
			scene.value.remove(obj)
		}

		obj.traverse((node) => {
			const mesh = node as THREE.Mesh | THREE.Line | THREE.Points
			if (mesh.geometry && typeof mesh.geometry.dispose === 'function') {
				mesh.geometry.dispose()
			}
			if (mesh.material) disposeMaterials(mesh.material)
		})

		meshes.delete(id)
	}

	function updateLocked(shapeID: string, mesh: THREE.Object3D) {
		const isLocked = lockedShapeIDs.value.has(shapeID)
		const LOCKED_COLOR = COLORS.shape.locked.fill
		const color = isLocked ? new THREE.Color(LOCKED_COLOR) : new THREE.Color(mesh.userData.color)

		const materials = collectMaterialsFromObject(mesh)
		materials.forEach((mat) => {
			if (isShaderMaterial(mat) && mat.uniforms.uIsLocked) {
				mat.uniforms.uIsLocked.value = isLocked
			} else if ('color' in mat && mat.color instanceof THREE.Color) {
				mat.color.set(color)
			}
		})
	}
	function updateOpacity(mesh: THREE.Object3D, opacity: number) {
		const materials = collectMaterialsFromObject(mesh)
		materials.forEach((mat) => {
			if (isShaderMaterial(mat) && mat.uniforms.uGlobalOpacity) {
				gsap.to(mat.uniforms.uGlobalOpacity, {
					value: opacity,
					duration: 0.3,
					onUpdate: () => requestDraw.value(),
				})
			} else if ('opacity' in mat) {
				gsap.to(mat, {
					opacity: opacity,
					duration: 0.3,
					onUpdate: () => requestDraw.value(),
				})
			}
		})
	}

	return {
		create,
		update,
		removeShapeWithAnimation,
		remove,
		updateLocked,
		updateOpacity,
		brushTexture,
	}
}
