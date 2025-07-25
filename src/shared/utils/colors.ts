import * as THREE from 'three'

export const pastelPalette = [
	'hsl(340, 60%, 80%)',
	'hsl(200, 50%, 80%)',
	'hsl(140, 50%, 80%)',
	'hsl(50,  60%, 80%)',
	'hsl(280, 50%, 80%)',
	'hsl(10,  60%, 80%)',
]
export function getRandomPastelColor(): string {
	const index = Math.floor(Math.random() * pastelPalette.length)
	return pastelPalette[index]
}

export function generateShiftedColors(baseColor: THREE.Color, count: number, maxHueShift = 0.1) {
	const colors = new Float32Array(count * 3)
	const hsl = { h: 0, s: 0, l: 0 }
	baseColor.getHSL(hsl)

	for (let i = 0; i < count; i++) {
		const shiftedHue = (hsl.h + (Math.random() - 0.5) * maxHueShift + 1) % 1
		const shiftedColor = new THREE.Color().setHSL(shiftedHue, hsl.s, hsl.l)
		colors[i * 3] = shiftedColor.r
		colors[i * 3 + 1] = shiftedColor.g
		colors[i * 3 + 2] = shiftedColor.b
	}

	return colors
}

export function lightenColor(color: string, amount = 5): string {
	const m = color.match(/hsla?\(\s*(\d+),\s*([\d.]+)%,\s*([\d.]+)%(?:,\s*([\d.]+))?\)/)
	if (!m) return color

	const h = Number(m[1])
	const s = Number(m[2])
	const l = Number(m[3])

	const ns = Math.min(100, s + 15)
	const nl = Math.min(90, l + amount)
	return `hsl(${h}, ${ns}%, ${nl}%)`
}
export function shadeColor(color: string, amount = 40): string {
	const m = color.match(/hsl\(\s*(\d+),\s*([\d.]+)%,\s*([\d.]+)%\s*\)/)
	if (!m) return '#000'

	const h = Number(m[1])
	const s = Number(m[2])
	const l = Number(m[3])

	const ns = Math.min(100, s + 15)
	const nl = Math.max(0, l - amount)

	return `hsl(${h}, ${ns}%, ${nl}%)`
}
