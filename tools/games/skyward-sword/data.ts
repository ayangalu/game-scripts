import { readdirSync } from 'node:fs';
import path from 'node:path';

import { DataType } from '@nishin/reader';

import type { FormatTree, ShiftOutFormatter } from '../../parsers/nintendo/message-studio/format';
import { ensure } from '../../ensure';
import {
	capitalizationFormatter,
	colorFormatter,
	hex,
	rubyFormatter,
	variableFormatter,
	ShiftCode,
} from '../../parsers/nintendo/message-studio/format';
import { MSBT } from '../../parsers/nintendo/message-studio/msbt';
import { U8 } from '../../parsers/nintendo/u8';

const commonEmoji = {
	0x00: ['button-a'],
	0x01: ['button-b'],
	0x02: ['button-minus'],
	0x03: ['button-plus'],
	0x04: ['button-1'],
	0x05: ['button-2'],
	0x06: ['button-c'],
	0x0f: ['d-pad'],
	0x10: ['d-pad', 'up'],
	0x11: ['d-pad', 'down'],
	0x12: ['d-pad', 'left'],
	0x13: ['d-pad', 'right'],
	0x14: ['arrow', 'up'],
	0x15: ['arrow', 'down'],
	0x16: ['arrow', 'left'],
	0x17: ['arrow', 'right'],
	0x18: ['pointer'],
	0x19: ['x-mark'],
	0x1a: ['insect-mark'],
};

const emoji = {
	'skyward-sword': {
		...commonEmoji,
		0x07: ['button-z'],
		0x08: ['stick', 'center'],
		0x09: ['stick', 'move', 'up'],
		0x0a: ['stick', 'move', 'down'],
		0x0b: ['stick', 'move', 'left'],
		0x0c: ['stick', 'move', 'right'],
		0x0d: ['stick', 'axis', 'y'],
		0x0e: ['stick', 'axis', 'x'],
	},
	'skyward-sword-hd': {
		...commonEmoji,
		0x07: ['button-zl'],
		0x08: ['stick', 'l', 'center'],
		0x09: ['stick', 'l', 'move', 'up'],
		0x0a: ['stick', 'l', 'move', 'down'],
		0x0b: ['stick', 'l', 'move', 'left'],
		0x0c: ['stick', 'l', 'move', 'right'],
		0x0d: ['stick', 'l', 'axis', 'y'],
		0x0e: ['stick', 'l', 'axis', 'x'],
		0x1b: ['button-a'],
		0x1c: ['button-b'],
		0x1d: ['button-y'],
		0x1e: ['button-x'],
		0x1f: ['button-minus'],
		0x20: ['button-plus'],
		0x21: ['d-pad'],
		0x22: ['d-pad', 'up'],
		0x23: ['d-pad', 'down'],
		0x24: ['d-pad', 'left'],
		0x25: ['d-pad', 'right'],
		0x26: ['button-l'],
		0x27: ['button-zl'],
		0x28: ['button-r'],
		0x29: ['button-zr'],
		0x2a: ['stick', 'l', 'center'],
		0x2b: ['stick', 'l', 'move', 'up'],
		0x2c: ['stick', 'l', 'move', 'down'],
		0x2d: ['stick', 'l', 'move', 'left'],
		0x2e: ['stick', 'l', 'move', 'right'],
		0x2f: ['stick', 'l', 'press'],
		0x30: ['stick', 'l', 'axis', 'y'],
		0x31: ['stick', 'l', 'axis', 'x'],
		0x32: ['stick', 'r', 'center'],
		0x33: ['stick', 'r', 'move', 'up'],
		0x34: ['stick', 'r', 'move', 'down'],
		0x35: ['stick', 'r', 'move', 'left'],
		0x36: ['stick', 'r', 'move', 'right'],
		0x37: ['stick', 'r', 'press'],
		0x38: ['stick', 'r', 'axis', 'y'],
		0x39: ['stick', 'r', 'axis', 'x'],
	},
};

const controls = {
	0x00: {
		name: ['button', 'a', 'press'],
		parts: [['button', 'a']],
	},
	0x01: {
		name: ['button', 'b', 'hold'],
		parts: [['button', 'b'], ['arrow']],
	},
	0x02: {
		name: ['button', 'zl', 'hold'],
		parts: [['button', 'zl'], ['arrow']],
	},
	0x03: {
		name: ['stick', 'l', 'tilt'],
		parts: [['stick', 'l'], ['arrow']],
	},
	0x04: {
		name: ['stick', 'l', 'xy'],
		parts: [['stick', 'l']],
	},
	0x05: {
		name: ['joy-con', 'l', 'shake'],
		parts: [['joy-con', 'l']],
	},
	0x06: {
		name: ['joy-con', 'r', 'shake'],
		parts: [['joy-con', 'r']],
	},
	0x07: {
		name: ['joy-con', 'r', 'flick', 'up'],
		parts: [['joy-con', 'r', 'up'], ['joy-con', 'r', 'down'], ['arrow']],
	},
	0x08: {
		name: ['joy-con', 'r', 'tilt'],
		parts: [['joy-con', 'r', 'right'], ['joy-con', 'r', 'left'], ['joy-con', 'r', 'center'], ['arrow']],
	},
	0x09: {
		name: ['joy-con', 'r', 'thrust'],
		parts: [['joy-con', 'r'], ['arrow']],
	},
	0x0a: {
		name: ['stick', 'r', 'tilt'],
		parts: [['stick', 'r'], ['arrow']],
	},
	0x0b: {
		name: ['joy-cons', 'flick', 'down'],
		parts: [
			['joy-con', 'l', 'down'],
			['joy-con', 'r', 'down'],
			['joy-con', 'l', 'up'],
			['joy-con', 'r', 'up'],
			['arrow'],
		],
	},
	0x0c: {
		name: ['stick', 'r', 'x'],
		parts: [['stick', 'r']],
	},
	0x0d: {
		name: ['stick', 'r', 'slash'],
		parts: [['stick', 'r']],
	},
	0x0e: {
		name: ['button', 'x', 'press'],
		parts: [['button', 'x']],
	},
	0x0f: {
		name: ['button', 'l', 'hold'],
		parts: [['button', 'l'], ['arrow']],
	},
	0x10: {
		name: ['stick', 'r', 'xy'],
		parts: [['stick', 'r']],
	},
	0x11: {
		name: ['stick', 'r', 'y'],
		parts: [['stick', 'r']],
	},
	0x12: {
		name: ['joy-cons', 'swing', 'left'],
		parts: [
			['joy-con', 'l', 'left'],
			['joy-con', 'l', 'right'],
			['joy-con', 'l', 'center'],
			['joy-con', 'r', 'left'],
			['joy-con', 'r', 'right'],
			['joy-con', 'r', 'center'],
			['arrow'],
		],
	},
};

const josa = {
	0x00: ['', '이'],
	0x01: ['는', '은'],
	0x02: ['를', '을'],
	0x03: ['가', '이'],
	0x04: ['와', '과'],
	0x05: ['로', '으로'],
};

function choiceFormatter(index: number): ShiftOutFormatter {
	return ({ openMarkupTags }) => {
		let markup = '';

		const moveSpans: string[] = [];

		while (openMarkupTags[0]?.startsWith('span')) {
			moveSpans.unshift(openMarkupTags.shift()!);
			markup += `</span>`;
		}

		if (index === 0) {
			openMarkupTags.unshift('ul');
			markup += '<ul>';
		} else {
			// expect last tag to be choice item
			openMarkupTags.shift();
			markup += `</li>`;
		}

		const classList = ['choice', `option-${index + 1}`];

		markup += `<li class="${classList.join(' ')}">`;

		for (const selector of moveSpans) {
			const spanClassList = selector.split('.').slice(1);
			markup += `<span class="${spanClassList.join(' ')}">`;
		}

		openMarkupTags.unshift(`li.${classList.join('.')}`);
		openMarkupTags.unshift(...moveSpans.reverse());

		return markup;
	};
}

function buildFormatters(version: 'skyward-sword' | 'skyward-sword-hd') {
	const minimalFormatters = {
		[ShiftCode.Out]: {
			0x0000: {
				0x0000: rubyFormatter(),
			},
		},
	};

	const root = path.join('data', version, 'messages');

	const archives = readdirSync(root).map((locale) => {
		return [locale, new U8(path.join(root, locale, '0-Common.arc'))] as const;
	});

	const itemMap = archives.reduce<Record<string, Record<number, string>>>((resultMap, [locale, u8]) => {
		const msbt = new MSBT(ensure(u8.files.find(({ name }) => name === '003-ItemGet.msbt')?.data), minimalFormatters);
		resultMap[locale] = msbt.entries.filter(({ label }) => label.startsWith('NAME_ITEM_')).map(({ value }) => value);
		return resultMap;
	}, {});

	const wordMap = archives.reduce<Record<string, Record<number, string>>>((resultMap, [locale, u8]) => {
		const msbt = new MSBT(ensure(u8.files.find(({ name }) => name === 'word.msbt')?.data), minimalFormatters);

		resultMap[locale] = msbt.entries
			.filter(({ label }) => {
				// word.msbt is used for variable words with multiple variants
				// the japanese locale contains variants for counters for numbers 1-10 and the default pronunciation
				// all other locales seem to use the same format for singular/plural forms of different words
				if (locale === 'ja-JP') {
					// 00 is the default pronunciation
					return label.endsWith(':00');
				}

				// the text dump will display the # sign as numeric placeholder
				// the plural form of words seems more natural to insert in this case than the singular form

				if (locale === 'ru-RU') {
					// plural forms in russian are more complex and actually have three different variants
					// https://www.russianlessons.net/lessons/lesson11_main.php has some information on the subject
					// if understood correctly the third form is used for general quantities
					return label.endsWith(':03');
				}

				// 02 is the general plural form for other locales (or the same as the singular form)
				return label.endsWith(':02');
			})
			.reduce<Record<number, string>>((result, { label, value }) => {
				const index = parseInt(ensure(/:(\d{3}):/.exec(label))[1]);
				result[index] = value;
				return result;
			}, {});

		return resultMap;
	}, {});

	return (locale: string): FormatTree => {
		return {
			[ShiftCode.Out]: {
				0x0000: {
					0x0000: rubyFormatter(),
					0x0003: colorFormatter<number>({
						lookup: (parameters) => parameters.next(DataType.Uint16).value,
						reset: [0xffff],
						colors: {
							0x0000: 'emphasis',
							0x0001: 'warning',
							0x0002: 'legend',
							0x0003: 'name',
							0x0004: 'action',
							0x0005: 'item',
							0x0006: 'intro',
							0x0007: 'rupee-green',
							0x0008: 'rupee-blue',
							0x0009: 'rupee-red',
							0x000a: 'rupee-silver',
							0x000b: 'rupee-gold',
							0x000c: 'rupee-baba',
						},
					}),
				},
				0x0001: {
					0x0000: choiceFormatter(0),
					0x0001: choiceFormatter(1),
					0x0002: choiceFormatter(2),
					0x0003: choiceFormatter(3),
				},
				0x0002: {
					0x0000: () => `<player-name character="tloz:link"></player-name>`,
					0x0001: variableFormatter(2, itemMap[locale], (option) => `<debug-token>2:1:${option}</debug-token>`),
					0x0002: variableFormatter(
						4,
						Array.from({ length: 20 }).map((_, i) => String.fromCodePoint(0x2460 + i)),
						(option) => `<debug-token>2:2:${option}</debug-token>`,
						(content) => `<span class="placeholder">${content}</span>`,
					),
					0x0003: () => `<span class="placeholder">＃</span>`,
					0x0004: variableFormatter(
						1,
						emoji[version],
						(option) => `<debug-token>2:4:${option}</debug-token>`,
						(classes) => `<span class="emoji ${classes.join(' ')}"></span>`,
					),
					0x0005: variableFormatter(
						1,
						controls,
						(option) => `<debug-token>2:5:${option}</debug-token>`,
						({ name, parts }) =>
							`<span class="controls ${name.join(' ')}">${parts
								.map((id) => `<span class="${id.join(' ')}"></span>`)
								.join('')}</span>`,
					),
				},
				0x0003: {
					0x0000: () => `<sup>`,
					0x0001: capitalizationFormatter(),
					0x0002: variableFormatter(
						1,
						josa,
						(option) => `<debug-token>3:2:${option}</debug-token>`,
						([moeum, batchim]) => `<ko-josa moeum="${moeum}" batchim="${batchim}"></ko-josa>`,
					),
					0x0003: variableFormatter(1, wordMap[locale], (option) => `[3:3:${hex(option)}]`),
					0x0004: variableFormatter(1, wordMap[locale], (option) => `[3:4:${hex(option)}]`),
				},
			},
			[ShiftCode.In]: {
				0x0003: {
					0x0000: () => `</sup>`,
				},
			},
		};
	};
}

export const data = {
	wii: buildFormatters('skyward-sword'),
	switch: buildFormatters('skyward-sword-hd'),
};
