export function mapEntries<T, U>(source: Record<string, T>, callback: (key: string, value: T) => [string, U]): Record<string, U> {
	return Object.fromEntries(Object.entries(source).map(([ key, value, ]) => callback(key, value)));
}
