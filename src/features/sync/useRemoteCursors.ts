import { ref } from 'vue'
import type { Awareness } from 'y-protocols/awareness'

import type { PositionXY } from '@/shared/types/PositionXY.ts'

type RemoteCursor = {
	worldPos: PositionXY
	name: string
	color: string
}
type ClientID = string

function pastelColorFromClientID(id: number): string {
	const hue = (id * 47) % 360
	return `hsl(${hue}, 70%, 85%)`
}

export function useRemoteCursors(provider: { awareness: Awareness }) {
	const otherCursors = ref<Record<ClientID, RemoteCursor>>({})

	provider.awareness.setLocalStateField('name', 'Sergey')
	provider.awareness.setLocalStateField('color', pastelColorFromClientID(provider.awareness.clientID))
	function updateCursor(worldPos: PositionXY) {
		provider.awareness.setLocalStateField('cursor', { x: worldPos.x, y: worldPos.y })
	}

	provider.awareness.on('change', () => {
		const states = provider.awareness.getStates()
		const newCursors: Record<ClientID, RemoteCursor> = {}

		states.forEach((state, clientID) => {
			if (clientID !== provider.awareness.clientID && state.cursor) {
				newCursors[clientID] = {
					worldPos: { x: state.cursor.x, y: state.cursor.y },
					name: state.name,
					color: state.color,
				}
			}
		})

		otherCursors.value = newCursors
	})

	function drawCursors(ctx: CanvasRenderingContext2D, worldToScreenFn = (worldPos: PositionXY) => worldPos) {
		for (const cursor of Object.values(otherCursors.value)) {
			const size = 16
			const { worldPos, name, color } = cursor
			const { x, y } = worldToScreenFn(worldPos)

			// cursor
			ctx.beginPath()
			ctx.moveTo(x, y)
			ctx.lineTo(x + size, y + size / 2)
			ctx.lineTo(x + size / 3, y + size)
			ctx.closePath()
			ctx.fillStyle = color
			ctx.fill()

			// badge
			ctx.font = '12px sans-serif'
			const textWidth = ctx.measureText(name).width
			const badgeX = x + size
			const badgeY = y + size
			const badgeW = textWidth + 8 * 2
			const badgeH = 20
			ctx.fillStyle = color
			ctx.beginPath()
			ctx.roundRect(badgeX, badgeY, badgeW, badgeH, [0, 6, 6, 6])
			ctx.fill()

			// text
			ctx.fillStyle = '#fff'
			ctx.fillText(name, badgeX + 8, badgeY + 14)
		}
	}

	return {
		otherCursors,
		updateCursor,
		drawCursors,
	}
}
