import type { BinaryReader } from '@nishin/reader';
import { DataType } from '@nishin/reader';

export abstract class Asset {
	protected readonly reader: BinaryReader<Buffer>;
	protected readonly version: number;
	protected readonly platform: number;

	constructor(reader: BinaryReader<Buffer>, version: number, platform: number) {
		this.reader = reader;
		this.version = version;
		this.platform = platform;
	}

	protected readAlignedString() {
		const length = this.reader.next(DataType.Int32).value;

		if (length <= 0 || length > this.reader.byteLength - this.reader.offset) {
			return '';
		}

		const data = this.reader.next(DataType.array(DataType.Uint8, length)).value;

		this.reader.align(4);

		return Buffer.from(data).toString('utf-8');
	}
}
