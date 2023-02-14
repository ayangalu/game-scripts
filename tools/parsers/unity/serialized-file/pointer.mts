import type { BinaryReader } from '@nishin/reader';
import { DataType } from '@nishin/reader';

import { Version } from './version.mjs';

export class Pointer {
	readonly fileId: number;
	readonly pathId: bigint;

	constructor(reader: BinaryReader<Buffer>, version: number) {
		this.fileId = reader.next(DataType.Int32);
		this.pathId =
			version < Version.Unknown14
				? reader.next(DataType.bigint({ signed: true, byteLength: 4 }))
				: reader.next(DataType.BigInt64);
	}
}
