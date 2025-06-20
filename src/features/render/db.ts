import { openDB } from 'idb'
import { toRaw } from 'vue'

import type { Shape } from '@/features/render/types/Shape.ts'

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

export async function getShapesDB(): Promise<Shape[]> {
	console.log('DB get all')
	const db = await dbPromise
	return (await db.getAll(STORE_NAME)) || []
}

export async function saveShapeDB(shape: Shape) {
	console.log('DB save')
	const db = await dbPromise
	await db.put(STORE_NAME, toRaw(shape))
}

export async function deleteShapeDB(id: string) {
	console.log('DB delete')
	const db = await dbPromise
	await db.delete(STORE_NAME, id)
}

export async function clearShapesDB() {
	const db = await dbPromise
	const tx = db.transaction(STORE_NAME, 'readwrite')
	await tx.objectStore(STORE_NAME).clear()
	await tx.done
}
