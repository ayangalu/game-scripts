import { BinaryReader, DataType } from '../../binary';
import { Version } from './version';

export class Pointer {
	readonly fileId: number;
	readonly pathId: bigint;

	constructor(reader: BinaryReader, version: number) {
		this.fileId = reader.next(DataType.Int32);
		this.pathId = version < Version.Unknown14 ? reader.next(DataType.BigInt32) : reader.next(DataType.BigInt64);
	}
}
