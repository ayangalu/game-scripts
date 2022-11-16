import type { BinaryReader, Encoding, SafeIntBytes } from '@nishin/reader';
import { DataType } from '@nishin/reader';
import { encode as htmlEncode } from 'html-entities';

import type { Mutable } from '../../../../types';

export const enum ShiftCode {
	Out = 0xe,
	In = 0xf,
}

export function isShiftCode(value: number | undefined): value is ShiftCode {
	// @ts-expect-error
	return [0x0e, 0x0f].includes(value);
}

export type ShiftOutFormatter = (data: {
	reader: BinaryReader<Buffer>;
	encoding: Encoding;
	parameters: BinaryReader<Buffer>;
	openMarkupTags: string[];
	tagFormatters: FormatTree;
}) => string;

export type ShiftInFormatter = (data: {
	reader: BinaryReader<Buffer>;
	encoding: Encoding;
	openMarkupTags: string[];
	tagFormatters: FormatTree;
}) => string;

type FormatSubTree<Formatter extends ShiftOutFormatter | ShiftInFormatter> = Partial<{
	[group: number]: Partial<{
		[tag: number]: Formatter;
	}>;
}>;

export type FormatTree = Partial<{
	0x0e: FormatSubTree<ShiftOutFormatter>;
	0x0f: FormatSubTree<ShiftInFormatter>;
}>;

export interface ShiftControl {
	readonly code: ShiftCode;
	readonly group: number;
	readonly tag: number;
	readonly parameters?: BinaryReader<Buffer>;
}

export function processShiftCode(
	code: ShiftCode,
	reader: BinaryReader<Buffer>,
	encoding: Encoding,
	openMarkupTags: string[],
	tagFormatters: FormatTree,
): ShiftControl | string {
	const control: Mutable<ShiftControl> = {
		code,
		group: reader.next(DataType.Uint16).value,
		tag: reader.next(DataType.Uint16).value,
	};

	if (code === ShiftCode.Out) {
		const parameterByteCount = reader.next(DataType.Uint16).value;
		control.parameters = reader.slice(parameterByteCount);
	}

	const format = tagFormatters[code]?.[control.group]?.[control.tag];

	return (
		format?.({
			reader,
			encoding,
			// @ts-expect-error
			parameters: control.parameters,
			openMarkupTags,
			tagFormatters,
		}) ?? control
	);
}

export function closeMarkup(openSelectors: string[]) {
	return openSelectors.map((tag) => `</${tag.split('.')[0]}>`).join('');
}

export function hex(value: number, length?: number) {
	const x = value.toString(16);

	if (typeof length === 'number') {
		return `0x${x.padStart(length, '0')}`;
	}

	const nextPower = Math.pow(2, Math.ceil(Math.log2(x.length)));

	return `0x${x.padStart(nextPower === 1 ? 2 : nextPower, '0')}`;
}

export function rubyFormatter(): ShiftOutFormatter {
	return ({ reader, encoding, parameters }) => {
		const byteCountBase = parameters.next(DataType.Uint16).value;
		const byteCountRuby = parameters.next(DataType.Uint16).value;

		const rubyText = parameters.next(DataType.string(encoding));

		if (rubyText.byteLength !== byteCountRuby) {
			throw new Error(`ruby text byte count mismatch`);
		}

		let baseBytesRead = 0;
		let base = '';

		while (baseBytesRead < byteCountBase) {
			const char = reader.next(DataType.char(encoding));
			base += htmlEncode(char.value);
			baseBytesRead += char.byteLength;
		}

		if (baseBytesRead !== byteCountBase) {
			throw new Error(`ruby base byte count mismatch`);
		}

		return `<ruby>${base}<rt>${htmlEncode(rubyText.value)}</rt></ruby>`;
	};
}

export function colorFormatter<T extends string | number>({
	colors,
	lookup,
	reset,
}: {
	colors: Partial<Record<T, string>>;
	lookup: (reader: BinaryReader<Buffer>) => T;
	reset: T[];
}): ShiftOutFormatter {
	return ({ parameters, openMarkupTags }) => {
		const option = lookup(parameters);

		let markup = '';

		const [lastTag, ...lastClassList] = openMarkupTags[0]?.split('.') ?? [];

		if (lastTag === 'span' && lastClassList.includes('color')) {
			openMarkupTags.shift();
			markup += `</span>`;
		}

		if (reset.includes(option)) {
			return markup;
		}

		const classList = [
			'color',
			colors[option] ?? ['unknown', typeof option === 'number' ? hex(option, 4) : option],
		].flat();

		openMarkupTags.unshift(`span.${classList.join('.')}`);

		return markup + `<span class="${classList.join(' ')}">`;
	};
}

export function variableFormatter<T>(
	byteLength: SafeIntBytes,
	variables: Partial<Record<number, T>>,
	unknown: (option: number) => string,
	template = (variable: T) => `${variable}`,
): ShiftOutFormatter {
	return ({ parameters }) => {
		const option = parameters.next(DataType.int({ signed: false, byteLength })).value;
		if (typeof variables[option] !== 'undefined') {
			return template(variables[option]!);
		}
		return unknown(option);
	};
}

export function capitalizationFormatter(): ShiftOutFormatter {
	return ({ reader, encoding, openMarkupTags, tagFormatters }) => {
		let char = reader.next(DataType.char(encoding)).value;
		const code = char.codePointAt(0);

		if (isShiftCode(code)) {
			const result = processShiftCode(code, reader, encoding, openMarkupTags, tagFormatters);
			char = typeof result === 'string' ? result : '';
		} else {
			char = htmlEncode(char);
		}

		return `<span class="capitalize">${char}</span>`;
	};
}
