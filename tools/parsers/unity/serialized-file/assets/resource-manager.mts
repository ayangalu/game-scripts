import type { BinaryReader } from '@nishin/reader';
import { repeat, DataType } from '@nishin/reader';

import { Pointer } from '../pointer.mjs';
import { Asset } from './asset.mjs';

export class ResourceManager extends Asset {
	readonly resources: Map<string, Pointer>;

	constructor(reader: BinaryReader<Buffer>, version: number, platform: number) {
		super(reader, version, platform);
		this.resources = new Map(
			repeat(reader.next(DataType.Int32), () => {
				return [this.readAlignedString(), new Pointer(reader, version)];
			}),
		);
	}
}
