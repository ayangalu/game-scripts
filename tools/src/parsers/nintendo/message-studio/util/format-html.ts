import type { BinaryReader, Encoding, SafeIntBytes } from '@nishin/reader';
import { DataType, ReadMode } from '@nishin/reader';
import { encode } from 'html-entities';

import type { ControlSequenceBegin, ControlSequenceEnd, Message } from '../msbt.js';
import type {
	ControlPartTransformer,
	ControlSequenceTransformerTree,
	TransformerData,
	TransformMacro,
	TransformResult,
} from './format-text.js';
import { formatText } from './format-text.js';

export type OpeningTag = {
	readonly name: string;
	readonly type: 'opening';
	readonly classList?: readonly string[];
	readonly attribute?: Readonly<Record<string, string>>;
};

export type ClosingTag = {
	readonly name: string;
	readonly type: 'closing';
};

export type MarkupTag = OpeningTag | ClosingTag;

export type MarkupState = {
	readonly openTags: OpeningTag[];
};

export type BeginTransformer<State> = ControlPartTransformer<ControlSequenceBegin, MarkupTag, State & MarkupState>;
export type EndTransformer<State> = ControlPartTransformer<ControlSequenceEnd, MarkupTag, State & MarkupState>;
export type TransformerTree<State = {}> = ControlSequenceTransformerTree<MarkupTag, State & MarkupState>;

export function closeTags(openMarkupTags: readonly MarkupTag[]) {
	return openMarkupTags.map(({ name }) => `</${name}>`).join('');
}

export function formatHtml<State extends object>(
	message: Message,
	state: State,
	controlTransformers: TransformerTree<State>,
	finalize: (tokens: Array<string | MarkupTag>) => Array<string | MarkupTag> = (tokens) => tokens,
) {
	const markupState: MarkupState = {
		openTags: [],
	};

	return formatText(
		message,
		{
			stringPart: ({ part }) => encode(part),
			controlParts: controlTransformers,
		},
		(tokens) => {
			const processed = finalize(tokens)
				.map((token) => {
					if (typeof token === 'string') {
						return token;
					}

					if (token.type === 'opening') {
						const attributes = Object.entries({
							...token.attribute,
							...(token.classList?.length ? { class: token.classList.join(' ') } : {}),
						}).map(([key, value]) => `${key}="${value}"`);
						return attributes.length ? `<${token.name} ${attributes.join(' ')}>` : `<${token.name}>`;
					}

					return `</${token.name}>`;
				})
				.join('');

			return processed + closeTags(markupState.openTags);
		},
		{
			...state,
			...markupState,
		},
	);
}

export function rubyTransformer(): BeginTransformer<MarkupState> {
	return ({ reader, encoding, part: { payload } }) => {
		const byteCountBase = payload.next(DataType.Uint16);
		const byteCountRuby = payload.next(DataType.Uint16);

		const rubyText = payload.next(DataType.string(encoding), ReadMode.Source);

		if (rubyText.source.byteLength !== byteCountRuby) {
			throw new Error(`ruby text byte count mismatch`);
		}

		let baseBytesRead = 0;
		let base = '';

		while (baseBytesRead < byteCountBase) {
			const char = reader.next(DataType.char(encoding), ReadMode.Source);
			base += char.value;
			baseBytesRead += char.source.byteLength;
		}

		if (baseBytesRead !== byteCountBase) {
			throw new Error(`ruby base byte count mismatch`);
		}

		return `<ruby>${encode(base)}<rt>${encode(rubyText.value)}</rt></ruby>`;
	};
}

export function colorTransformer<Type extends string | number>({
	colors,
	lookup,
	reset,
}: {
	readonly colors: Partial<Record<Type, string>>;
	readonly lookup: (reader: BinaryReader<Buffer>) => Type;
	readonly reset: readonly Type[];
}): BeginTransformer<MarkupState> {
	return ({ part: { payload }, state: { openTags } }) => {
		const option = lookup(payload);

		const tokens: Array<string | MarkupTag> = [];

		const lastTag = openTags[0];

		if (lastTag?.name === 'span' && lastTag.classList?.includes('color')) {
			openTags.shift();
			tokens.push({ name: 'span', type: 'closing' });
		}

		const color = colors[option];

		if (reset.includes(option) || !color) {
			return tokens;
		}

		const classList = ['color', color];

		openTags.unshift({
			name: 'span',
			type: 'opening',
			classList,
		});

		tokens.push(openTags[0]!);

		return tokens;
	};
}

export function placeholderTransformer<State = MarkupState>(
	symbol: string | ((payload: BinaryReader<Buffer>, encoding: Encoding) => string),
): BeginTransformer<State> {
	return ({ encoding, part: { payload } }) => {
		const content = typeof symbol === 'string' ? symbol : symbol(payload, encoding);
		return [{ name: 'span', type: 'opening', classList: ['placeholder'] }, content, { name: 'span', type: 'closing' }];
	};
}

export function variableTransformer<T, State = MarkupState>(
	byteLength: SafeIntBytes,
	variables: Partial<Record<number, T>>,
	template: (
		variable: T,
		data: TransformerData<ControlSequenceBegin, State & MarkupState>,
	) => TransformResult<MarkupTag> = (variable: T) => `${variable}`,
): BeginTransformer<State> {
	return (data) => {
		const option = data.part.payload.next(DataType.int({ signed: false, byteLength }));
		const variable = variables[option];
		return typeof variable === 'undefined' ? '' : template(variable, data);
	};
}

export function capitalizationMacro(locale: string): TransformMacro<MarkupTag> {
	return (before, after) => {
		let flag = false;

		return [
			...before,
			...after.map((item) => {
				if (!flag && typeof item === 'string') {
					flag = true;
					const firstLetter = item.slice(0, 1);
					return `${firstLetter.toLocaleUpperCase(locale)}${item.slice(1)}`;
				}

				return item;
			}),
		];
	};
}
