import { BinaryReader, DataArray, DataType } from '../../../binary';
import { Asset } from './asset';

export class TextAsset extends Asset {
	readonly name: string;
	readonly data: Buffer;

	constructor(reader: BinaryReader, version: number, platform: number) {
		super(reader, version, platform);
		// TODO: EditorExtension
		this.name = this.readAlignedString();
		this.data = Buffer.from(reader.next(DataArray(DataType.UInt8, reader.next(DataType.Int32))));
	}
}
