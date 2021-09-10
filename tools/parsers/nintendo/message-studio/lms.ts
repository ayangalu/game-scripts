import { repeat, BinaryReader, DataArray, DataType, Encoding } from '../../binary';

type BlockProcessor<T> = (reader: BinaryReader, encoding: Encoding) => T;

type BlockProcessors<T extends Record<string, unknown>> = {
	[P in keyof T]: BlockProcessor<T[P]>;
};

export function processLabelBlock(reader: BinaryReader) {
	return repeat(reader.next(DataType.UInt32), () => {
		return {
			labelCount: reader.next(DataType.UInt32),
			offset: reader.next(DataType.UInt32),
		};
	}).reduce<string[]>((labels, { labelCount, offset }) => {
		reader.seek(offset);
		repeat(labelCount, () => {
			const length = reader.next(DataType.UInt8);
			const label = reader.next(DataArray(DataType.CharASCII, length));
			labels[reader.next(DataType.UInt32)] = label;
		});
		return labels;
	}, []);
}

// https://github.com/kinnay/Nintendo-File-Formats/wiki/LMS-File-Format
export abstract class LMS<Blocks extends Record<keyof Blocks, unknown>> {
	readonly buffer: Buffer;
	readonly encoding: Encoding;
	readonly blocks: Partial<Readonly<Blocks>>;

	constructor(source: string | Buffer, magic: string, knownVersions: number[], blocks: BlockProcessors<Blocks>) {
		const reader = new BinaryReader(source).checkMagic(magic).checkBOM(8);

		this.buffer = reader.buffer;

		reader.skip(2);

		const [encoding, version, blockCount] = reader.next(DataType.UInt8, DataType.UInt8, DataType.UInt16);

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

		if (reader.next(DataType.UInt32) !== reader.buffer.length) {
			throw new Error(`unexpected file size`);
		}

		reader.skip(10);

		this.blocks = {};

		repeat(blockCount, () => {
			const [name, size] = reader.next(DataArray(DataType.CharASCII, 4), DataType.UInt32);

			reader.skip(8);

			// @ts-expect-error
			const processor: BlockProcessor<unknown> = blocks[name];

			if (processor) {
				// @ts-expect-error
				this.blocks[name] = processor(reader.slice(size), this.encoding);
			} else {
				// console.log(`unknown block: ${name}`);
			}

			const padding = ((-size % 0x10) + 0x10) % 0x10;
			reader.skip(size + padding);
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
