import fs from "node:fs";
import path from "node:path";

import { clone, createMerge, isComposite, type Composite, type DeepMergeFunction } from "@tao/merge";

type Transformers = Record<string, (target: Composite, source: Composite, merge: DeepMergeFunction) => unknown>;

export class Skeleton {
	#data: Record<string, unknown> = {};
	readonly #directory: string;
	readonly #merge: DeepMergeFunction;

	constructor (directory: string, transformers: Transformers = {}) {
		fs.mkdirSync(directory, { recursive: true, });

		this.#directory = directory;

		this.#merge = createMerge({
			visit: ({ key, values: [ target, source, ], }) => {
				target ??= Array.isArray(source) ? [] : {};

				if (key in transformers && isComposite(target) && isComposite(source)) {
					return transformers[key]!(target, source, this.#merge);
				}

				if (isComposite(source) && Object.values(source).every((value) => typeof value === "string")) {
					return {};
				}

				if (isComposite(target) && isComposite(source)) {
					return this.#merge(target, source);
				}

				return clone(target, source);
			},
		});
	}

	update(source: Record<string, unknown>) {
		this.#data = this.#merge(this.#data, source);
	}

	persist() {
		fs.writeFileSync(path.join(this.#directory, "skeleton.json"), JSON.stringify(this.#data));
	}
}
