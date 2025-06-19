type AnyFunction = (...args: never[]) => void

export function debounce<F extends AnyFunction>(fn: F, delay: number): F {
	let timeoutID: ReturnType<typeof setTimeout> | null = null

	return ((...args: Parameters<F>) => {
		if (timeoutID) clearTimeout(timeoutID)
		timeoutID = setTimeout(() => fn(...args), delay)
	}) as F
}
