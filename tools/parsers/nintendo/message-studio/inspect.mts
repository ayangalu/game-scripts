import { readdirSync } from 'node:fs';

import type { BinaryReader } from '@nishin/reader';

import { U8 } from '../u8.mjs';
import { ControlCode, MSBT } from './msbt.mjs';

export interface MessageTree {
	[key: string]: MSBT | MessageTree;
}

export type LocalizedMessageTree = Record<string, MessageTree>;

export function readMSBT(source: string, filter: (path: string) => boolean = () => true): LocalizedMessageTree {
	const processSubTree = (directory: string) => {
		return readdirSync(directory, { withFileTypes: true }).reduce<MessageTree>((result, entry) => {
			const path = `${directory}/${entry.name}`;

			if (!filter(path)) {
				return result;
			}

			if (entry.isDirectory()) {
				result[entry.name] = processSubTree(path);
			} else {
				if (entry.name.endsWith('.msbt')) {
					result[entry.name] = new MSBT(path);
				}

				if (entry.name.endsWith('.arc')) {
					for (const { name, data } of new U8(path).files) {
						if (name.endsWith('.msbt')) {
							result[name] = new MSBT(data);
						}
					}
				}
			}

			return result;
		}, {});
	};

	return Object.fromEntries(readdirSync(source).map((locale) => [locale, processSubTree(`${source}/${locale}`)]));
}

type ControlCodesConfig = {
	ignore: Record<number, number[]>;
	formatPayload: Record<number, Record<number, (payload: BinaryReader<Buffer>) => string>>;
};

export function controlCodes(
	source: LocalizedMessageTree,
	{ ignore = {}, formatPayload }: Partial<ControlCodesConfig> = {},
) {
	const result: NRecord<number, NRecord<string, unknown[], 4>, 3> = Object.create(null, {
		0x0e: { value: Object.create(null, {}) },
		0x0f: { value: Object.create(null, {}) },
	});

	const processSubTree = (locale: string, tree: MessageTree) => {
		for (const [key, node] of Object.entries(tree)) {
			if (node instanceof MSBT) {
				node.blocks.TXT2?.forEach((message, index) => {
					for (const part of message.parts) {
						if (typeof part === 'object') {
							if (!ignore[part.group]?.includes(part.tag)) {
								const format = formatPayload?.[part.group]?.[part.tag] ?? ((reader) => reader.buffer.toString('hex'));
								const displayPayload = part.code === ControlCode.Begin ? format(part.payload) : 'N/A';

								const tags = result[part.code][part.group] ?? Object.create(null, {});
								const payloads = tags[part.tag] ?? Object.create(null, {});
								const locales = payloads[displayPayload] ?? Object.create(null, {});
								const files = locales[locale] ?? Object.create(null, {});
								const labels = files[key] ?? Object.create(null, {});

								const label = node.blocks.LBL1![index];

								labels[label] = message.parts.map((m) => {
									if (typeof m === 'string') {
										return m;
									}

									return Object.create(null, {
										code: { value: m.code },
										group: { value: m.group },
										tag: { value: m.tag },
										...(m.code === ControlCode.Begin
											? {
													payload: { value: m.payload.buffer.toString('hex') },
													reader: { value: m.payload },
											  }
											: {}),
									});
								});

								payloads[displayPayload] = locales;
								files[key] = labels;
								locales[locale] = files;

								tags[part.tag] = payloads;
								result[part.code][part.group] = tags;
							}
						}
					}
				});
			} else {
				processSubTree(locale, node);
			}
		}
	};

	for (const [locale, tree] of Object.entries(source)) {
		processSubTree(locale, tree);
	}

	return result;
}
