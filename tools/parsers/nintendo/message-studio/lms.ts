import { readFileSync } from 'node:fs';

import { repeat, BinaryReader, DataType, Encoding } from '@nishin/reader';

type BlockProcessor<T> = (reader: BinaryReader<Buffer>, encoding: Encoding) => T;

type BlockProcessorCollection<T extends Record<string, unknown>> = {
	[P in keyof T]: BlockProcessor<T[P]>;
};

export function processLabelBlock(reader: BinaryReader) {
	return repeat(reader.next(DataType.Uint32).value, () => {
		const labelCount = reader.next(DataType.Uint32).value;
		const offset = reader.next(DataType.Uint32).value;
		return { labelCount, offset };
	}).reduce<string[]>((labels, { labelCount, offset }) => {
		reader.seek(offset);
		repeat(labelCount, () => {
			const length = reader.next(DataType.Uint8).value;
			const label = reader.next(DataType.string(Encoding.ASCII, { count: length })).value;
			const index = reader.next(DataType.Uint32).value;
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
		source: string | Buffer,
		magic: string,
		knownVersions: number[],
		blocks: BlockProcessorCollection<Blocks>,
	) {
		const data = typeof source === 'string' ? readFileSync(source) : source;

		const reader = new BinaryReader(data);

		reader.assertMagic(magic);
		reader.readByteOrderMark(8);

		this.buffer = reader.buffer;

		reader.skip(2);

		const encoding = reader.next(DataType.Uint8).value;
		const version = reader.next(DataType.Uint8).value;
		const blockCount = reader.next(DataType.Uint16).value;

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

		if (reader.next(DataType.Uint32).value !== reader.buffer.length) {
			throw new Error(`unexpected file size`);
		}

		reader.skip(10);

		this.blocks = {};

		repeat(blockCount, () => {
			const name = reader.next(DataType.string(Encoding.ASCII, { count: 4 })).value;
			const size = reader.next(DataType.Uint32).value;

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

	protected mapLabels<T>(labels: string[] = [], data: T[] = []): Array<{ label: string; value: T }> {
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
}
