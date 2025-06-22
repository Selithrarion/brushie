export function throttle<T extends (...args: never[]) => void>(func: T, wait: number) {
	let lastTime = 0
	let timeout: ReturnType<typeof setTimeout> | null = null

	return function (this: never, ...args: Parameters<T>) {
		const now = Date.now()
		const remaining = wait - (now - lastTime)

		if (remaining <= 0) {
			if (timeout) {
				clearTimeout(timeout)
				timeout = null
			}
			lastTime = now
			func.apply(this, args)
		} else if (!timeout) {
			timeout = setTimeout(() => {
				lastTime = Date.now()
				timeout = null
				func.apply(this, args)
			}, remaining)
		}
	}
}
