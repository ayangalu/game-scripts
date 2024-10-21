import type { BinaryReader, Encoding } from '@nishin/reader';
import { repeat, DataType } from '@nishin/reader';

import { processLabelBlock, LMS } from './lms.js';

export const enum ControlCode {
	Begin = 0xe,
	End = 0xf,
}

interface ControlSequenceBase {
	readonly code: ControlCode;
	readonly group: number;
	readonly tag: number;
}

export interface ControlSequenceBegin extends ControlSequenceBase {
	readonly code: ControlCode.Begin;
	readonly payload: BinaryReader<Buffer>;
}

export interface ControlSequenceEnd extends ControlSequenceBase {
	readonly code: ControlCode.End;
}

export type ControlSequence = ControlSequenceBegin | ControlSequenceEnd;

export type MessagePart = string | ControlSequence;

export type Message = {
	readonly reader: BinaryReader<Buffer>;
	readonly encoding: Encoding;
	readonly parts: readonly MessagePart[];
};

export type Attribute = {
	value: bigint;
	reference?: string;
};

interface Blocks {
	LBL1: string[];
	TSY1: number[];
	ATR1: Attribute[];
	TXT2: Message[];
}

export function isControlCode(value: number | undefined): value is ControlCode {
	return value === ControlCode.Begin || value === ControlCode.End;
}

export class MSBT extends LMS<Blocks> {
	get entries() {
		return this.mapLabels(this.blocks.LBL1, {
			attribute: this.blocks.ATR1,
			message: this.blocks.TXT2 ?? [],
			text: this.blocks.TXT2?.map((message) => message.parts.filter((part) => typeof part === 'string').join('')) ?? [],
		});
	}

	constructor(source: string | URL | Buffer) {
		super(source, 'MsgStdBn', [3], {
			LBL1: processLabelBlock,
			TSY1: (reader) => {
				return repeat(reader.buffer.length / 4, () => reader.next(DataType.Uint32));
			},
			ATR1: (reader, encoding) => {
				const result: Attribute[] = [];

				const count = reader.next(DataType.Uint32);
				const byteLength = reader.next(DataType.Uint32);

				if (!byteLength) {
					return [];
				}

				const type = DataType.bigint({ signed: false, byteLength });

				repeat(count, () => {
					result.push({
						value: reader.next(type),
					});
				});

				let index = 0;

				while (reader.hasNext()) {
					result[index]!.reference = reader.next(DataType.string(encoding));
					index++;
				}

				return result;
			},
			TXT2: (reader, encoding) => {
				return repeat(reader.next(DataType.Uint32), () => reader.next(DataType.Uint32)).map((offset) => {
					reader.seek(offset);

					const parts: MessagePart[] = [];

					let stringPart = '';
					let char = reader.next(DataType.char(encoding));

					while (char !== '\0') {
						const code = char.codePointAt(0);

						if (isControlCode(code)) {
							if (stringPart) {
								parts.push(stringPart);
								stringPart = '';
							}

							const group = reader.next(DataType.Uint16);
							const tag = reader.next(DataType.Uint16);

							if (code === ControlCode.Begin) {
								const payloadByteLength = reader.next(DataType.Uint16);
								const payload = reader.slice(payloadByteLength);
								parts.push({ code, group, tag, payload });
							} else {
								parts.push({ code, group, tag });
							}
						} else {
							stringPart += char;
						}

						char = reader.next(DataType.char(encoding));
					}

					if (stringPart) {
						parts.push(stringPart);
					}

					const bytesRead = reader.offset - offset;

					reader.seek(offset);

					return {
						reader: reader.slice(bytesRead),
						encoding,
						parts,
					};
				});
			},
		});
	}
}
