import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { Composite } from '@shigen/merge';
import { clone, createMerge, isComposite } from '@shigen/merge';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type DeepMergeFunction = typeof import('@shigen/merge').deepMerge;

type Transformers = Record<string, (target: Composite, source: Composite, merge: DeepMergeFunction) => unknown>;

export class Skeleton {
	private data: Record<string, unknown> = {};

	private readonly directory: string;

	private merge: DeepMergeFunction;

	constructor(directory: string, transformers: Transformers = {}) {
		this.directory = directory;

		mkdirSync(directory, { recursive: true });

		this.merge = createMerge<DeepMergeFunction>({
			visit: ({ key, values: [target, source] }) => {
				target ??= Array.isArray(source) ? [] : {};

				if (key in transformers && isComposite(target) && isComposite(source)) {
					return transformers[key](target, source, this.merge);
				}

				if (isComposite(source) && Object.values(source).every((value) => typeof value === 'string')) {
					return {};
				}

				if (isComposite(target) && isComposite(source)) {
					return this.merge(target, source);
				}

				return clone(target, source);
			},
		});
	}

	update(source: Record<string, unknown>) {
		this.data = this.merge(this.data, source);
	}

	persist() {
		writeFileSync(path.join(this.directory, 'skeleton.json'), JSON.stringify(this.data));
	}
}
