// export function getRandomPastelColor(): string {
// 	const hue = Math.floor(Math.random() * 360)
// 	const saturation = 60 + Math.random() * 20
// 	const lightness = 60 + Math.random() * 10
// 	return `hsl(${hue}, ${saturation}%, ${lightness}%)`
// }

const pastelPalette = [
	'hsl(340, 60%, 80%)',
	'hsl(200, 50%, 80%)',
	'hsl(140, 50%, 80%)',
	'hsl(50,  60%, 80%)',
	'hsl(280, 50%, 80%)',
	'hsl(10,  60%, 80%)',
]
export function getRandomPastelColor(): string {
	const idx = Math.floor(Math.random() * pastelPalette.length)
	return pastelPalette[idx]
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
