import { openDB } from 'idb'
import { toRaw } from 'vue'

import type { Shape } from '@/features/render/Shape.ts'

const DB_NAME = 'figma'
const STORE_NAME = 'shapes'

const dbPromise = openDB(DB_NAME, 1, {
	upgrade(db) {
		if (!db.objectStoreNames.contains(STORE_NAME)) {
			db.createObjectStore(STORE_NAME, { keyPath: 'id' })
		}
	},
	blocked: () => {
		console.warn('Database blocked - other instance is open')
	},
	blocking: () => {
		console.warn('Database blocking - newer version trying to open')
	},
	terminated: () => {
		console.error('Database connection terminated unexpectedly')
	},
})

export async function getShapes(): Promise<Shape[]> {
	const db = await dbPromise
	return (await db.getAll(STORE_NAME)) || []
}

export async function saveShape(shape: Shape) {
	const db = await dbPromise
	await db.put(STORE_NAME, toRaw(shape))
}

export async function deleteShape(id: string) {
	const db = await dbPromise
	await db.delete(STORE_NAME, id)
}
