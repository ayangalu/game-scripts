export function mapEntries<T, U>(source: Record<string, T>, callback: (value: T, key: string) => U): Record<string, U> {
	return Object.fromEntries(Object.entries(source).map(([ key, value, ]) => [ key, callback(value, key), ]));
}
