import { readFileSync } from 'node:fs';

import type { O } from 'ts-toolbelt'; // replace with type-fest?
import { repeat, BinaryReader, DataType, Encoding } from '@nishin/reader';

import { ensure } from '../../../assert.js';

type BlockProcessor<T> = (reader: BinaryReader<Buffer>, encoding: Encoding) => T;

type BlockProcessorCollection<T extends Record<string, unknown>> = {
	[P in keyof T]: BlockProcessor<T[P]>;
};

export function processLabelBlock(reader: BinaryReader) {
	return repeat(reader.next(DataType.Uint32), () => {
		const labelCount = reader.next(DataType.Uint32);
		const offset = reader.next(DataType.Uint32);
		return { labelCount, offset };
	}).reduce<string[]>((labels, { labelCount, offset }) => {
		reader.seek(offset);
		repeat(labelCount, () => {
			const length = reader.next(DataType.Uint8);
			const label = reader.next(DataType.string(Encoding.ASCII, { count: length }));
			const index = reader.next(DataType.Uint32);
			labels[index] = label;
		});
		return labels;
	}, []);
}

// https://github.com/kinnay/Nintendo-File-Formats/wiki/LMS-File-Format
export abstract class LMS<Blocks extends Record<keyof Blocks, unknown>> {
	readonly buffer: Buffer;
	readonly encoding: Encoding;
	readonly blocks: Partial<Readonly<Blocks>>;

	constructor(
		source: string | URL | Buffer,
		magic: string,
		knownVersions: number[],
		blocks: BlockProcessorCollection<Blocks>,
	) {
		const data = source instanceof Buffer ? source : readFileSync(source);

		const reader = new BinaryReader(data);

		reader.assertMagic(magic);
		reader.readByteOrderMark(8);

		this.buffer = reader.buffer;

		reader.skip(2);

		const encoding = reader.next(DataType.Uint8);
		const version = reader.next(DataType.Uint8);
		const blockCount = reader.next(DataType.Uint16);

		/* prettier-ignore */
		switch (encoding) {
         case 0: this.encoding = Encoding.UTF8; break;
         case 1: this.encoding = Encoding.UTF16; break;
         case 2: this.encoding = Encoding.UTF32; break;
         default: throw new Error(`unknown encoding: ${encoding}`)
      }

		if (!knownVersions.includes(version)) {
			throw new Error(`unknown version: ${version}`);
		}

		reader.skip(2);

		if (reader.next(DataType.Uint32) !== reader.buffer.length) {
			throw new Error(`unexpected file size`);
		}

		reader.skip(10);

		this.blocks = {};

		repeat(blockCount, () => {
			const name = reader.next(DataType.string(Encoding.ASCII, { count: 4 }));
			const size = reader.next(DataType.Uint32);

			reader.skip(8);

			// @ts-expect-error
			const processor: BlockProcessor<unknown> = blocks[name];

			if (processor) {
				// @ts-expect-error
				this.blocks[name] = processor(reader.slice(size), this.encoding);
			} else {
				reader.skip(size);
			}

			reader.align(0x10);
		});
	}

	protected mapLabels<T extends Partial<Record<string, unknown[]>>>(
		labels?: string[],
		data?: T,
	): Array<
		{ label: string } & { [P in O.NonNullableKeys<T>]: NonNullable<T[P]>[number] } & {
			[P in O.NullableKeys<T>]?: NonNullable<T[P]>[number];
		}
	>;
	protected mapLabels<T>(labels?: string[], data?: T[]): Array<{ label: string; value: T }>;
	protected mapLabels(labels: string[] = [], data?: any[] | Record<string, any[] | undefined>): any {
		if (!data) {
			return [];
		}

		if (Array.isArray(data)) {
			if (labels.length !== data.length) {
				throw new Error(`data/labels mismatch`);
			}

			return labels.map((label, index) => {
				return {
					label,
					value: data[index],
				};
			});
		}

		const resultMap = new Map<string, any>();

		for (const [key, list] of Object.entries(data)) {
			if (!list || !list.length) {
				continue;
			}

			if (labels.length !== list.length) {
				throw new Error(`data/labels mismatch for item '${key}'`);
			}

			list.forEach((value, index) => {
				const label = ensure(labels[index]);
				const item = resultMap.get(label) ?? { label };
				item[key] = value;
				resultMap.set(label, item);
			});
		}

		return [...resultMap.values()];
	}
}
