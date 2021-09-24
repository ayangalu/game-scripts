import { BinaryReader, DataArray, DataType } from '../../../binary';

export abstract class Asset {
	protected readonly reader: BinaryReader;
	protected readonly version: number;
	protected readonly platform: number;

	constructor(reader: BinaryReader, version: number, platform: number) {
		this.reader = reader;
		this.version = version;
		this.platform = platform;
	}

	protected readAlignedString() {
		const length = this.reader.next(DataType.Int32);

		if (length <= 0 || length > this.reader.buffer.length - this.reader.offset) {
			return '';
		}

		const data = this.reader.next(DataArray(DataType.UInt8, length));

		this.reader.align(4);

		return Buffer.from(data).toString('utf-8');
	}
}
