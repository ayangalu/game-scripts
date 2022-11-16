import { BinaryReader, DataType } from '@nishin/reader';

import { Asset } from './asset';

export class TextAsset extends Asset {
	readonly name: string;
	readonly data: Buffer;

	constructor(reader: BinaryReader<Buffer>, version: number, platform: number) {
		super(reader, version, platform);
		// TODO: EditorExtension
		this.name = this.readAlignedString();
		const bufferSize = reader.next(DataType.Int32).value;
		this.data = Buffer.from(reader.next(DataType.array(DataType.Uint8, bufferSize)).value);
	}
}
