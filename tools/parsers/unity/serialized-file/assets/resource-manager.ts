import { BinaryReader, DataArray, DataType, repeat } from '../../../binary';
import { Pointer } from '../pointer';
import { Asset } from './asset';

export class ResourceManager extends Asset {
	readonly resources: Map<string, Pointer>;

	constructor(reader: BinaryReader, version: number, platform: number) {
		super(reader, version, platform);
		this.resources = new Map(
			repeat(reader.next(DataType.Int32), () => {
				return [this.readAlignedString(), new Pointer(reader, version)];
			}),
		);
	}
}
