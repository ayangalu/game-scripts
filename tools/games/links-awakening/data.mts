import { DataType } from '@nishin/reader';

import type { MarkupTag, TransformerTree } from '../../parsers/nintendo/message-studio/format.html.mjs';
import { placeholderTransformer } from '../../parsers/nintendo/message-studio/format.html.mjs';
import { variableTransformer } from '../../parsers/nintendo/message-studio/format.html.mjs';
import { colorTransformer } from '../../parsers/nintendo/message-studio/format.html.mjs';
import { rubyTransformer } from '../../parsers/nintendo/message-studio/format.html.mjs';
import { ControlCode } from '../../parsers/nintendo/message-studio/msbt.mjs';

const colors = {
	'6cd2ffff': 'info',
	'df1000ff': 'caution',
	'd9456dff': 'red',
	'0095efff': 'blue',
	'63e343ff': 'green',
	'62cfffff': 'cyan',
	'a0ffffff': 'staff',
};

const emoji1 = {
	0x00: 'yoshi',
	0x01: 'ribbon',
	0x02: 'dogfood',
	0x03: 'banana',
	0x04: 'stick',
	0x05: 'honeycomb',
	0x06: 'pineapple',
	0x07: 'hibiscus',
	0x08: 'letter',
	0x09: 'broom',
	0x0a: 'hook',
	0x0b: 'necklace',
	0x0c: 'scale',
	0x0d: 'link',
	0x0e: 'marin',
	0x0f: 'x',
	0x10: 'skull',
	0x12: 'arrow-up',
	0x13: 'arrow-down',
	0x14: 'arrow-right',
	0x15: 'arrow-left',
};

const emoji2 = {
	0x00: 'button-a',
	0x01: 'button-b',
	0x04: 'button-x',
	0x05: 'button-y',
	0x07: 'stick-l',
	0x0c: 'button-l',
	0x0d: 'button-r',
	0x0e: 'button-plus',
	0x0f: 'button-minus',
	0x10: 'button-l',
	0x11: 'button-r',
	0x12: 'button-b',
	0x15: 'button-a',
	0x16: 'button-x',
	0x17: 'button-y',
	0x18: 'button-y',
	0x19: 'button-x',
	0x1a: 'button-plus',
	0x1b: 'stick-r',
	0x1c: 'd-pad-down',
	0x20: 'button-a',
	0x27: 'button-a',
	0x28: 'button-b',
	0x29: 'button-y',
	0x2a: 'button-a',
	0x2c: 'button-r',
	0x2d: 'button-a',
	0x2e: 'button-b',
	0x2f: 'button-b',
	0x30: 'button-a',
	0x31: 'button-x',
	0x32: 'button-l',
	0x33: 'button-r',
	0x34: 'd-pad-up',
	0x35: 'button-x',
	0x36: 'button-a',
	0x37: 'button-a',
	0x38: 'button-l-start',
	0x39: 'button-r-start',
	0x3a: 'button-a',
};

export const transformers: TransformerTree = {
	[ControlCode.Begin]: {
		0x0000: {
			0x0000: rubyTransformer(),
			0x0003: colorTransformer<string>({
				colors,
				reset: ['edededff', '000000ff'],
				lookup: ({ buffer }) => buffer.toString('hex'),
			}),
			0x0004: ({ state: { openTags } }) => {
				if (openTags.find(({ name }) => name === 'ul')) {
					const tokens: Array<string | MarkupTag> = [];

					if (openTags[0].name === 'li') {
						openTags.shift();
						tokens.push({ name: 'li', type: 'closing' });
					}

					openTags.unshift({ name: 'li', type: 'opening' });
					tokens.push(openTags[0]);
					return tokens;
				}

				return '\n\n';
			},
		},
		0x0001: {
			0x0000: variableTransformer(1, emoji1, (icon) => [
				{ name: 'span', type: 'opening', classList: ['emoji', icon] },
				{ name: 'span', type: 'closing' },
			]),
			0x0001: variableTransformer(1, emoji2, (icon) => [
				{ name: 'span', type: 'opening', classList: ['emoji', icon] },
				{ name: 'span', type: 'closing' },
			]),
			0x0002: placeholderTransformer((payload) => `${payload.next(DataType.Uint8)}`),
			0x0003: () => [
				{ name: 'player-name', type: 'opening', attribute: { character: 'tloz:link' } },
				{ name: 'player-name', type: 'closing' },
			],
			0x0007: ({ reader, state: { openTags } }) => {
				openTags.unshift({ name: 'ul', type: 'opening' });

				const tokens: Array<string | MarkupTag> = [openTags[0]];

				const lastOffset = reader.offset;

				if (reader.next(DataType.Uint8) === 0x0a) {
					openTags.unshift({ name: 'li', type: 'opening' });
					tokens.push(openTags[0]);
				} else {
					reader.seek(lastOffset);
				}

				return tokens;
			},
			0x000a: placeholderTransformer('#'),
			0x0012: ({ part: { payload }, encoding }) => {
				const byteLength = payload.next(DataType.Uint16);
				return payload.next(DataType.string(encoding, { byteLength }));
			},
			0x0013: ({ part: { payload }, encoding }) => {
				const moeumByteLength = payload.next(DataType.Uint16);
				const moeum = payload.next(DataType.string(encoding, { byteLength: moeumByteLength }));
				const batchimByteLength = payload.next(DataType.Uint16);
				const batchim = payload.next(DataType.string(encoding, { byteLength: batchimByteLength }));
				return [
					{ name: 'ko-josa', type: 'opening', attribute: { moeum, batchim } },
					{ name: 'ko-josa', type: 'closing' },
				];
			},
		},
	},
};
