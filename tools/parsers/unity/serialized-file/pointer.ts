import { BinaryReader, DataType } from '@nishin/reader';
import { Version } from './version';

export class Pointer {
	readonly fileId: number;
	readonly pathId: bigint;

	constructor(reader: BinaryReader<Buffer>, version: number) {
		this.fileId = reader.next(DataType.Int32).value;
		this.pathId =
			version < Version.Unknown14
				? reader.next(DataType.bigint({ signed: true, byteLength: 4 })).value
				: reader.next(DataType.BigInt64).value;
	}
}
