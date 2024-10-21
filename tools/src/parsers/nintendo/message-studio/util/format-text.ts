import type { BinaryReader, Encoding } from '@nishin/reader';
import { DataType } from '@nishin/reader';

import type { ControlSequence, ControlSequenceBegin, ControlSequenceEnd, Message, MessagePart } from '../msbt.js';
import { isControlCode } from '../msbt.js';
import { ControlCode } from '../msbt.js';

type TokenPrimitive = string | number | boolean | bigint | Record<string, unknown>;

export type TransformResult<Token extends TokenPrimitive> = string | Token | Array<string | Token>;

export type TransformMacro<Token> = (
	before: ReadonlyArray<string | Token>,
	after: ReadonlyArray<string | Token>,
) => Array<string | Token>;

export type TransformerData<Part extends MessagePart, State extends object> = {
	readonly reader: BinaryReader<Buffer>;
	readonly encoding: Encoding;
	readonly part: Part;
	readonly state: State;
};

export type PartTransformer<Part extends MessagePart, Token extends TokenPrimitive, State extends object> = (
	data: TransformerData<Part, State>,
) => TransformResult<Token> | TransformMacro<Token>;

export type StringPartTransformer<Token extends TokenPrimitive, State extends object> = PartTransformer<
	string,
	Token,
	State
>;

export type ControlPartTransformer<
	Type extends ControlSequence,
	Token extends TokenPrimitive,
	State extends object,
> = PartTransformer<Type, Token, State>;

export type ControlTagTransformerTree<
	Type extends ControlSequence,
	Token extends TokenPrimitive,
	State extends object,
> = Partial<{
	readonly [group: number]: Partial<{
		readonly [tag: number]: ControlPartTransformer<Type, Token, State>;
	}>;
}>;

export type ControlSequenceTransformerTree<Token extends TokenPrimitive, State extends object> = Partial<{
	readonly 0x0e: ControlTagTransformerTree<ControlSequenceBegin, Token, State>;
	readonly 0x0f: ControlTagTransformerTree<ControlSequenceEnd, Token, State>;
}>;

export type MessagePartTransformers<Token extends TokenPrimitive, State extends object = {}> = Partial<{
	readonly stringPart: StringPartTransformer<Token, State>;
	readonly controlParts: ControlSequenceTransformerTree<Token, State>;
}>;

export function formatText<Token extends TokenPrimitive, State extends object>(
	message: Message,
	transformers: MessagePartTransformers<Token, State>,
	finalize: (tokens: Array<string | Token>) => string,
	state: State,
): string;
export function formatText<Token extends TokenPrimitive>(
	message: Message,
	transformers: MessagePartTransformers<Token>,
	finalize: (tokens: Array<string | Token>) => string,
): string;
export function formatText(message: Message, transformers: MessagePartTransformers<string>): string;
export function formatText<Token extends TokenPrimitive, State extends object>(
	{ reader, encoding }: Message,
	transformers: MessagePartTransformers<Token, State>,
	finalize = (tokens: Array<string | Token>) => tokens.filter((token) => typeof token === 'string').join(''),
	state?: State,
): string {
	const type = DataType.char(encoding);

	const resultItems: Array<string | Token | TransformMacro<Token>> = [];

	const addResultItem = (item: TransformResult<Token> | TransformMacro<Token> | undefined) => {
		if (typeof item === 'undefined') {
			return;
		}

		if (Array.isArray(item)) {
			resultItems.push(...item);
		} else {
			resultItems.push(item);
		}
	};

	let part = '';
	let char = reader.next(type);

	state = state ?? ({} as State);

	while (char !== '\0') {
		const code = char.codePointAt(0);

		if (isControlCode(code)) {
			if (part) {
				addResultItem(transformers?.stringPart?.({ reader, encoding, part, state }) ?? part);
				part = '';
			}

			const group = reader.next(DataType.Uint16);
			const tag = reader.next(DataType.Uint16);

			if (code === ControlCode.Begin) {
				const payloadByteLength = reader.next(DataType.Uint16);
				const payload = reader.slice(payloadByteLength);

				addResultItem(
					transformers.controlParts?.[0x0e]?.[group]?.[tag]?.({
						reader,
						encoding,
						part: { code, group, tag, payload },
						state,
					}),
				);
			} else {
				addResultItem(
					transformers.controlParts?.[0x0f]?.[group]?.[tag]?.({
						reader,
						encoding,
						part: { code, group, tag },
						state,
					}),
				);
			}
		} else {
			part += char;
		}

		char = reader.next(type);
	}

	if (part) {
		addResultItem(transformers?.stringPart?.({ reader, encoding, part, state }) ?? part);
	}

	let beforeMacro: Array<string | Token> = [];
	let afterMacro: Array<string | Token> = [];
	let macro: TransformMacro<Token> | undefined;

	for (const item of resultItems) {
		if (typeof item === 'function') {
			if (macro) {
				beforeMacro = macro(beforeMacro, afterMacro);
				afterMacro = [];
			}

			macro = item;
		} else {
			if (macro) {
				afterMacro.push(item);
			} else {
				beforeMacro.push(item);
			}
		}
	}

	if (macro) {
		return finalize(macro(beforeMacro, afterMacro));
	}

	return finalize(beforeMacro);
}
