import { readFileSync } from 'node:fs';

import type { DecodedValue, Decoder, DecoderResult } from '@inspector-hex/decoder-api';
import type { WritableDeep } from 'type-fest';
import { ByteOrder, DataType, NodeFileReader } from '@nishin/node-file-reader';

type FFXLocale = 'jp' | 'us' | 'ch' | 'cn' | 'kr';

type FileTable = Record<string, string>;

function safeFindIndex<T>(
	source: readonly T[],
	predicate: (value: T, index: number, source: readonly T[]) => unknown,
	fallback: number,
): number;
function safeFindIndex<T>(
	source: readonly T[],
	predicate: (value: T, index: number, source: readonly T[]) => unknown,
): number | undefined;
function safeFindIndex<T>(
	source: readonly T[],
	predicate: (value: T, index: number, source: readonly T[]) => unknown,
	fallback?: number,
) {
	const index = source.findIndex(predicate);
	return index === -1 ? fallback : index;
}

export const decoderFactory = (locale: FFXLocale, fileTable: FileTable = {}): Decoder => {
	const commonTable = readFileSync(
		`tools/games/ff10/source/pc/ffx_ps2/ffx/master/jppc/ffx_encoding/ffxsjistbl_${locale}.bin`,
		'utf-8',
	);

	return async (data, { offset, file }) => {
		const reader = new NodeFileReader(file.handle, ByteOrder.LittleEndian);

		const blockOffsets = [await reader.next(DataType.Uint16)];

		await reader.skip(6);

		while (reader.offset < blockOffsets[0]) {
			blockOffsets.push(await reader.next(DataType.Uint16));
			await reader.skip(6);
		}

		const blockListSkipSize = Math.max(0, blockOffsets[0] - offset);

		const result: WritableDeep<DecoderResult> = {
			offset,
			values: Array.from({ length: blockListSkipSize }, () => null),
		};

		if (result.values.length === data.length) {
			return result;
		}

		const relevantStartIndex = safeFindIndex(
			blockOffsets,
			(start, index) => {
				const next = index === blockOffsets.length - 1 ? file.byteLength : blockOffsets[index + 1];
				return start <= offset && offset < next;
			},
			0,
		);

		const relevantEndIndex = safeFindIndex(
			blockOffsets,
			(start) => {
				return start >= offset + data.length;
			},
			blockOffsets.length,
		);

		const relevantBlocks = blockOffsets.slice(relevantStartIndex, relevantEndIndex);

		if (relevantBlocks.length === 0) {
			return result;
		}

		if (offset >= relevantBlocks[0]) {
			result.offset = relevantBlocks[0];
		}

		await reader.seek(relevantBlocks[0]);

		const relevantByteLength = (blockOffsets[relevantEndIndex] ?? file.byteLength) - relevantBlocks[0];

		let decodedByteLength = 0;
		let color: string | undefined = undefined;

		while (decodedByteLength < relevantByteLength) {
			const value = await (async () => {
				const byte = await reader.next(DataType.Uint8);

				if (byte === 0x09) {
					// misc
					const id = await reader.next(DataType.Uint8);

					const item = (() => {
						switch (id) {
							case 0x30:
								return 'Window';
						}
					})();

					return {
						text: item ?? '?9',
						length: 2,
						style: {
							color: 'var(--vscode-editorGhostText-foreground)',
						},
					};
				}

				if (byte === 0x0a) {
					const id = await reader.next(DataType.Uint8);

					const tag = (() => {
						switch (id) {
							case 0x41:
								color = undefined;
								return 'White';
							case 0x43:
								color = 'var(--vscode-charts-yellow)';
								return 'Yellow';
							case 0x52:
								color = '#999';
								return 'Grey';
							case 0x88:
								color = 'var(--vscode-charts-blue)';
								return 'Blue';
							case 0x94:
								color = 'var(--vscode-charts-red)';
								return 'Red';
							case 0x97:
								color = 'pink';
								return 'Pink';
							case 0xa1:
								color = 'var(--vscode-charts-purple)';
								return 'Purple';
							case 0xb1:
								color = 'cyan';
								return 'Cyan';
						}
					})();

					return {
						text: tag ?? '?a',
						length: 2,
						style: {
							color: 'var(--vscode-editorGhostText-foreground)',
						},
					};
				}

				if (byte === 0x0b) {
					const id = await reader.next(DataType.Uint8);

					const button = (() => {
						switch (id) {
							case 0x20:
								return '[L1]';
						}
					})();

					return {
						text: button ?? '?b',
						length: 2,
						style: {
							color: 'var(--vscode-charts-green)',
						},
					};
				}

				if (byte === 0x13) {
					const id = await reader.next(DataType.Uint8);

					const name = (() => {
						switch (id) {
							case 0x30:
								return 'Tidus';
							case 0x31:
								return 'Yuna';
							case 0x32:
								return 'Auron';
							case 0x33:
								return 'Kimahri';
							case 0x34:
								return 'Wakka';
							case 0x35:
								return 'Lulu';
							case 0x36:
								return 'Rikku';
						}
					})();

					return {
						text: name ?? '?13',
						length: 2,
						style: {
							color: 'var(--vscode-charts-green)',
						},
					};
				}

				if (byte >= 0x10 && byte < 0x30) {
					const next = await reader.next(DataType.Uint8);

					const text = (() => {
						if (byte === 0x28) {
							const entry = Object.entries(fileTable).find(([key]) => {
								return file.uri.includes(key);
							});

							return entry?.[1][next - 0x30];
						}

						if (byte >= 0x2c) {
							return commonTable[(byte - 0x2b) * 208 + (next - 0x30)];
						}
					})();

					return {
						text,
						length: 2,
						style: {
							color: byte === 0x28 ? '#fb8350' : color,
						},
					};
				}

				if (byte >= 0x30 && byte < 0x30 + 208) {
					return {
						text: commonTable[byte - 0x30],
						length: 1,
						style: {
							color,
						},
					};
				}

				return { length: 1 };
			})();

			result.values.push(value as DecodedValue);
			decodedByteLength += value.length;
		}

		return result;
	};
};
