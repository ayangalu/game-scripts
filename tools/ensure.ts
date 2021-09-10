export function ensure<T>(value: T | null | undefined, errorMessage = 'value assertion failed'): T {
	if (value === null || typeof value === 'undefined') {
		throw new Error(errorMessage);
	}

	return value;
}
