import { repeat, DataType } from '@nishin/reader';
import { encode as htmlEncode } from 'html-entities';

import type { FormatTree, ShiftControl } from './format.mjs';
import { closeMarkup, isShiftCode, processShiftCode } from './format.mjs';
import { processLabelBlock, LMS } from './lms.mjs';

type Message = Array<string | ShiftControl>;

interface Blocks {
	LBL1: string[];
	TSY1: number[];
	TXT2: Message[];
}

export class MSBT extends LMS<Blocks> {
	get entries() {
		return this.mapLabels(
			this.blocks.LBL1,
			this.blocks.TXT2?.map((message) => {
				return message.filter((part) => typeof part === 'string').join('');
			}),
		);
	}

	constructor(source: string | Buffer, tagFormatters: FormatTree = {}, encode = htmlEncode) {
		super(source, 'MsgStdBn', [3], {
			LBL1: processLabelBlock,
			TSY1: (reader) => {
				return repeat(reader.buffer.length / 4, () => reader.next(DataType.Uint32));
			},
			TXT2: (reader, encoding) => {
				return repeat(reader.next(DataType.Uint32), () => reader.next(DataType.Uint32)).map((offset) => {
					reader.seek(offset);

					const openMarkupTags: string[] = [];
					const message: Message = [];

					let string = '';
					let char = reader.next(DataType.char(encoding));

					while (char !== '\0') {
						const code = char.codePointAt(0);

						if (isShiftCode(code)) {
							if (string) {
								message.push(string);
								string = '';
							}

							message.push(processShiftCode(code, reader, encoding, openMarkupTags, tagFormatters));
						} else {
							string += encode(char);
						}

						char = reader.next(DataType.char(encoding));
					}

					if (string) {
						message.push(string);
					}

					if (openMarkupTags.length) {
						message.push(closeMarkup(openMarkupTags));
					}

					return message;
				});
			},
		});
	}
}
