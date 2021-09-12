import type { FormatTree } from '../../parsers/nintendo/message-studio/format';
import { DataArray, DataType } from '../../parsers/binary';
import {
	hex,
	colorFormatter,
	rubyFormatter,
	variableFormatter,
	ShiftCode,
} from '../../parsers/nintendo/message-studio/format';

const colors = {
	'edededff': 'default',
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

export const shiftFormats: FormatTree = {
	[ShiftCode.Out]: {
		0x0000: {
			0x0000: rubyFormatter(),
			0x0003: colorFormatter<string>({
				colors,
				reset: '000000ff',
				lookup: ({ buffer }) => buffer.toString('hex'),
			}),
			0x0004: () => `<hr>`,
		},
		0x0001: {
			0x0000: variableFormatter(
				1,
				emoji1,
				(option) => `[1:0:${hex(option, 4)}]`,
				(icon) => `<span class="emoji ${icon}"></span>`,
			),
			0x0001: variableFormatter(
				1,
				emoji2,
				(option) => `[1:1:${hex(option, 4)}]`,
				(icon) => `<span class="emoji ${icon}"></span>`,
			),
			0x0002: ({ parameters }) => {
				const index = parameters.next(DataType.UInt8);
				return String.fromCodePoint(0x2460 + index);
			},
			0x0003: () => `<player-name character="tloz:link"></player-name>`,
			0x0007: () => ``, // TODO: selections
			0x000a: () => `<span class="placeholder"></span>`,
			0x0012: ({ parameters, encoding }) => {
				const count = parameters.next(DataType.UInt16);
				return parameters.next(DataArray({ type: 'char', encoding }, count));
			},
			0x0013: ({ parameters, encoding }) => {
				const moeumCount = parameters.next(DataType.UInt16);
				const moeum = parameters.next(DataArray({ type: 'char', encoding }, moeumCount));
				const batchimCount = parameters.next(DataType.UInt16);
				const batchim = parameters.next(DataArray({ type: 'char', encoding }, batchimCount));
				return `<ko-josa moeum="${moeum}" batchim="${batchim}"></ko-josa>`;
			},
		},
	},
};
