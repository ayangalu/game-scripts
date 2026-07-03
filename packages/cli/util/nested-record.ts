/* eslint-disable ts/no-unsafe-member-access */

import type { Subtract, Sum, TupleOf } from "type-fest";

export type Tree<T> = {
	[key: string]: Tree<T> | T;
};

type LeafValue = string | number | boolean | symbol | bigint | WeakKey;

export type NestedRecordSource<N extends number, V extends LeafValue, A extends unknown[] = TupleOf<N, void>> =
	N extends 1 ?
		{ [key: string]: V; } :
			A extends [unknown, ...infer R] ?
			{ [key: string]: NestedRecordSource<R["length"], V, R>; } :
		Tree<V>;

type Get<N extends number, V extends LeafValue, X extends number = 0, R = unknown> =
	X extends N ?
		unknown extends R ? ((path: (string | number)[]) => V | Tree<V>) :
		R :
	Get<N, V, Sum<X, 1>, R & (
		(path: TupleOf<Subtract<N, X>, string | number>) => X extends 0 ? V : NestedRecordSource<X, V>
	)>;

export type NestedRecord<N extends number, V extends LeafValue> = {
	readonly source: NestedRecordSource<N, V>;
	get: Get<N, V>;
	set(path: TupleOf<N, string | number>, value: V): void;
	emplace(path: TupleOf<N, string | number>, value: V): V;
	entries(): Generator<Entry<V, N>>;
};

export type Entry<V extends LeafValue, N extends number> = {
	readonly path: TupleOf<N, string>;
	readonly value: V;
};

export function nestedRecord<N extends number, V extends LeafValue>(): NestedRecord<N, V> {
	const source: NestedRecordSource<N, V> = Object.create(null);

	const complexValues = new WeakSet();

	const entries = function* (
		root: Tree<V>,
		path: readonly string[] = [],
	): Generator<Entry<V, N>> {
		for (const [ key, value, ] of Object.entries(root)) {
			if (typeof value === "object" && !complexValues.has(value)) {
				yield* entries(value as Tree<V>, [ ...path, key, ]);
			} else {
				yield {
					path: [ ...path, key, ] as TupleOf<N, string>,
					value: value as V,
				};
			}
		}
	};

	return {
		source,
		// @ts-expect-error
		get(path: (string | number)[]): V | Tree<V> {
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

			if (typeof value === "object") {
				complexValues.add(value);
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
		},
		entries() {
			return entries(source);
		},
	};
}
