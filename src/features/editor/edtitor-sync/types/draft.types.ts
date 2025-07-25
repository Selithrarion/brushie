export interface DraftShapeBase {
	authorID: number
}

export type TShapeDraft<T> = T & DraftShapeBase
