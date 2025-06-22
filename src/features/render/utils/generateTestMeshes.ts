import * as THREE from 'three'

export function generateTestMeshes(scene: THREE.Scene, count = 1000) {
	const size = Math.sqrt(count)
	const spacing = 65
	const meshes: THREE.Mesh[] = []

	for (let i = 0; i < count; i++) {
		const x = (i % size) * spacing
		const y = Math.floor(i / size) * spacing

		const geo = new THREE.PlaneGeometry(1, 1, 1)
		const mat = new THREE.MeshBasicMaterial({ color: 0x44aa88 })
		const mesh = new THREE.Mesh(geo, mat)

		mesh.scale.set(60, 60, 1)
		mesh.position.set(x, y, 0)
		scene.add(mesh)
		meshes.push(mesh)
	}
	return meshes
}
