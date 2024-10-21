export type NList<N extends number, T, A extends unknown[] = []> = A extends { length: N } ? A : NList<N, T, [...A, T]>;

export type NDict<N extends number, V, A extends unknown[] = NList<N, void>> =
	N extends 1 ?
		{ [key: string]: V } :
			A extends [unknown, ...infer R] ?
			{ [key: string]: NDict<R['length'], V, R> } :
		never;

export type NDictWrapper<N extends number, V> = {
	readonly source: NDict<N, V>;
	get(path: NList<N, string | number>): V;
	set(path: NList<N, string | number>, value: V): void;
	emplace(path: NList<N, string | number>, value: V): V;
}

export function nDict<N extends number, V>(): NDictWrapper<N, V> {
	const source: NDict<N, V> = Object.create(null);

	return {
		source,
		get(path: (string | number)[]) {
			let v: any = source;

			for (const key of path) {
				if (!(key in v)) {
					throw new Error(`"${key}" not in source path`);
				}

				v = v[key];
			}

			return v;
		},
		set(path: (string | number)[], value) {
			let v: any = source;

			for (const key of path.slice(0, -1)) {
				if (!v[key]) {
					v[key] = Object.create(null);
				}

				v = v[key];
			}

			v[path.at(-1)!] = value;
		},
		emplace(path, value) {
			try {
				return this.get(path);
			} catch {
				this.set(path, value);
				return value;
			}
		}
	}
}
