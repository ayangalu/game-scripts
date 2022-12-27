type Mutable<T> = {
	-readonly [P in keyof T]: T[P];
};

type ReadonlyDict<T> = Readonly<Record<string, T>>;

type NTuple<T, N extends number, A extends unknown[] = []> = A extends { length: N } ? A : NTuple<T, N, [...A, T]>;

type NRecord<K extends PropertyKey, V, N extends number, A extends unknown[] = NTuple<void, N>> = N extends 1
	? Record<K, V>
	: A extends [unknown, ...infer R]
	? Record<K, NRecord<K, V, R['length'], R>>
	: never;
