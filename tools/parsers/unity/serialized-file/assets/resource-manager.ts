import { BinaryReader, DataType, repeat } from '@nishin/reader';
import { Pointer } from '../pointer';
import { Asset } from './asset';

export class ResourceManager extends Asset {
	readonly resources: Map<string, Pointer>;

	constructor(reader: BinaryReader<Buffer>, version: number, platform: number) {
		super(reader, version, platform);
		this.resources = new Map(
			repeat(reader.next(DataType.Int32).value, () => {
				return [this.readAlignedString(), new Pointer(reader, version)];
			}),
		);
	}
}
