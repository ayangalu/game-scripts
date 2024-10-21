import type { BinaryReader } from '@nishin/reader';
import { DataType } from '@nishin/reader';
import { encode } from 'html-entities';

import type { Message, MSBT } from '@game-scripts/tools/parsers/nintendo/message-studio/msbt.js';
import type {
	BeginTransformer,
	MarkupTag,
	OpeningTag,
	TransformerTree,
} from '@game-scripts/tools/parsers/nintendo/message-studio/util/format-html.js';
import { ControlCode } from '@game-scripts/tools/parsers/nintendo/message-studio/msbt.js';
import {
	capitalizationMacro, colorTransformer, placeholderTransformer, rubyTransformer, variableTransformer,
} from '@game-scripts/tools/parsers/nintendo/message-studio/util/format-html.js';

interface State {
	readonly locale: string;
	readonly source: MSBT;
	readonly format: (message: Message) => string;
}

const emoji = {
	0x00: 'stick l up',
	0x01: 'stick l down',
	0x07: 'd-pad down',
	0x0a: 'button a',
	0x0b: 'button a',
	0x0c: 'button x',
	0x0d: 'button y',
	0x0e: 'button zl',
	0x0f: 'button zl',
	0x11: 'button b',
	0x14: 'button l',
	0x15: 'button r',
	0x17: 'button plus',
	0x18: 'button minus',
	0x19: 'arrow right',
	0x1a: 'arrow left',
	0x1b: 'arrow up',
	0x21: 'stick l press',
	0x22: 'stick r press',
	0x24: 'switch',
	0x25: 'button x',
	0x26: 'button x',
};

const choiceTransformerBase = (
	callback: (payload: BinaryReader<Buffer>, state: State) => Array<string | MarkupTag>,
): BeginTransformer<State> => {
	return ({ part: { payload }, state }) => {
		const tokens: Array<string | MarkupTag> = [];

		const moveSpans: OpeningTag[] = [];

		while (state.openTags[0]?.name.startsWith('span')) {
			moveSpans.unshift(state.openTags.shift()!);
			tokens.push({ name: 'span', type: 'closing' });
		}

		try {
			tokens.push({ name: 'ul', type: 'opening' }, ...callback(payload, state), { name: 'ul', type: 'closing' });
		} catch {}

		tokens.push(...moveSpans);

		state.openTags.unshift(...moveSpans.reverse());

		return tokens;
	};
};

const simpleChoiceTransformer = (): BeginTransformer<State> => {
	return choiceTransformerBase((payload, state) => {
		const tokens: Array<string | MarkupTag> = [];

		// last two bytes refer to indexes of preselected and default cancel options respectively and are ignored for formatting
		const choiceCount = (payload.byteLength - 2) / 2;

		for (let index = 0; index < choiceCount; index++) {
			const sourceLabel = `${payload.next(DataType.Uint16)}`.padStart(4, '0');
			const sourceEntry = state.source.entries.find(({ label }) => label === sourceLabel);

			if (!sourceEntry) {
				throw new Error();
			}

			tokens.push(
				{ name: 'li', type: 'opening', classList: ['choice', `option-${index}`] },
				state.format(sourceEntry.message),
				{ name: 'li', type: 'closing' },
			);
		}

		return tokens;
	});
};

const complexChoiceTransformer = (): BeginTransformer<State> => {
	return choiceTransformerBase((payload, state) => {
		const tokens: Array<string | MarkupTag> = [];

		let index = 0;

		while (payload.hasNext(4)) {
			const value = payload.next(DataType.Uint16);
			const symbolByteLength = payload.next(DataType.Uint16);

			payload.skip(symbolByteLength);

			if (value !== 0xffff) {
				const sourceLabel = `${value}`.padStart(4, '0');
				const sourceEntry = state.source.entries.find(({ label }) => label === sourceLabel);

				if (!sourceEntry) {
					throw new Error();
				}

				tokens.push(
					{ name: 'li', type: 'opening', classList: ['choice', `option-${index}`] },
					state.format(sourceEntry.message),
					{ name: 'li', type: 'closing' },
				);
			}

			index++;
		}

		return tokens;
	});
};

const articleTransformer =
	(data: Record<string, string>): BeginTransformer<State> =>
	({ state: { locale } }) => {
		const { language } = new Intl.Locale(locale);
		const article = data[language];

		if (article) {
			return `${article} `;
		}

		return '';
	};

const placeholderVariableTransformer = (): BeginTransformer<State> => {
	return placeholderTransformer((payload, encoding) => {
		const byteLength = payload.next(DataType.Uint16);
		return payload.next(DataType.string(encoding, { byteLength }));
	});
};

const josaTransformer = (): BeginTransformer<State> => {
	return ({ encoding, part: { payload } }) => {
		const batchimCount = payload.next(DataType.Uint16) / 2;
		const batchim = payload.next(DataType.string(encoding, { count: batchimCount }));
		const moeumCount = payload.next(DataType.Uint16) / 2;
		const moeum = payload.next(DataType.string(encoding, { count: moeumCount }));
		return [
			{ name: 'ko-josa', type: 'opening', attribute: { moeum, batchim } },
			{ name: 'ko-josa', type: 'closing' },
		];
	};
};

export const transformers: TransformerTree<State> = {
	[ControlCode.Begin]: {
		0x0000: {
			0x0000: rubyTransformer(),
			0x0001: variableTransformer(
				2,
				{
					0x0002: 'settings',
				},
				(variable, { reader, encoding }) => {
					reader.next(DataType.char(encoding));
					return [
						{ name: 'span', type: 'opening', classList: ['emoji', variable] },
						{ name: 'span', type: 'closing' },
					];
				},
			),
			0x0003: colorTransformer<number>({
				lookup: (payload) => payload.next(DataType.Uint16),
				reset: [0xffff],
				colors: {
					0x0000: 'emphasis',
					0x0002: 'highlight',
					0x0003: 'thought',
					0x0004: 'app-text',
					0x0005: 'app-highlight',
					0x0006: 'credits',
				},
			}),
			0x0004: () => '\n\n',
		},
		0x0001: {
			0x0004: simpleChoiceTransformer(),
			0x0005: simpleChoiceTransformer(),
			0x0006: simpleChoiceTransformer(),
			0x0007: variableTransformer(1, emoji, (classes) => [
				{ name: 'span', type: 'opening', classList: ['emoji', classes] },
				{ name: 'span', type: 'closing' },
			]),
			0x0008: complexChoiceTransformer(),
			0x0009: complexChoiceTransformer(),
			0x000a: simpleChoiceTransformer(),
		},
		0x0002: {
			0x0001: placeholderVariableTransformer(),
			0x0002: placeholderVariableTransformer(),
			0x0003: placeholderTransformer('?'),
			0x0004: placeholderTransformer('?'),
			0x0009: placeholderVariableTransformer(),
			0x000a: placeholderTransformer('?'),
			0x000b: placeholderVariableTransformer(),
			0x000c: placeholderVariableTransformer(),
			0x000e: placeholderVariableTransformer(),
			0x000f: placeholderVariableTransformer(),
			0x0010: placeholderVariableTransformer(),
			0x0011: placeholderVariableTransformer(),
			0x0012: placeholderVariableTransformer(),
			0x0013: placeholderVariableTransformer(),
		},
		0x00c9: {
			0x0001: articleTransformer({
				de: 'das',
				es: 'el',
				fr: 'le',
				it: 'il',
				nl: 'de',
			}),
			0x0002: articleTransformer({
				de: 'ein',
				es: 'un',
				fr: 'un',
				it: 'un',
				nl: 'een',
			}),
			0x0003: ({ state: { locale } }) => capitalizationMacro(locale),
			0x0005: ({ encoding, part: { payload } }) => {
				const byteLength = payload.next(DataType.Uint16);
				return byteLength ? payload.next(DataType.string(encoding, { byteLength })) : '';
			},
			0x0006: ({ encoding, part: { payload }, state: { locale } }) => {
				payload.skip(payload.next(DataType.Uint16));

				const byteLength = payload.next(DataType.Uint16);
				const defaultForm = payload.next(DataType.string(encoding, { byteLength }));

				if (locale === 'ru-RU') {
					payload.skip(2);
					return encode(payload.next(DataType.string(encoding)));
				}

				return encode(defaultForm);
			},
			0x0007: josaTransformer(),
			0x0008: josaTransformer(),
		},
	},
};
