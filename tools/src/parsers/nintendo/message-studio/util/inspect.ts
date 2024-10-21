import { readdirSync } from 'node:fs';

import type { BinaryReader } from '@nishin/reader';

import { nDict } from '../../../../n-dict.js';
import url from '../../../../url.js';
import { U8 } from '../../u8.js';
import { ControlCode, MSBT } from '../msbt.js';

export interface MessageTree {
	[key: string]: MSBT | MessageTree;
}

export type LocalizedMessageTree = Record<string, MessageTree>;

export function readMSBT(source: URL, filter: (path: URL) => boolean = () => true): LocalizedMessageTree {
	const processSubTree = (directory: URL) => {
		return readdirSync(directory, { withFileTypes: true }).reduce<MessageTree>((result, entry) => {
			const path = url.join(directory, entry.name);

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

	return Object.fromEntries(readdirSync(source).map((locale) => [locale, processSubTree(url.join(source, locale))]));
}

type ControlCodesConfig = {
	ignore: Record<number, number[]>;
	formatPayload: Record<number, Record<number, (payload: BinaryReader<Buffer>) => string>>;
};

export function controlCodes(
	source: LocalizedMessageTree,
	{ ignore = {}, formatPayload }: Partial<ControlCodesConfig> = {},
) {
	const result = nDict<7, unknown[]>();

	const processSubTree = (locale: string, tree: MessageTree) => {
		for (const [key, node] of Object.entries(tree)) {
			if (node instanceof MSBT) {
				node.blocks.TXT2?.forEach((message, index) => {
					for (const part of message.parts.filter((p) => typeof p === "object")) {
						if (!ignore[part.group]?.includes(part.tag)) {
							const format = formatPayload?.[part.group]?.[part.tag] ?? ((reader) => reader.buffer.toString('hex'));
							const displayPayload = part.code === ControlCode.Begin ? format(part.payload) : 'N/A';
							const label = node.blocks.LBL1![index]!;

							result.set([part.code, part.group, part.tag, displayPayload, locale, key, label], message.parts.map((m) => {
								if (typeof m === 'string') {
									return m;
								}

								const result = nDict<1, unknown>();

								result.set(['code'], m.code);
								result.set(['group'], m.group);
								result.set(['tag'], m.tag);

								if (m.code === ControlCode.Begin) {
									result.set(["payload"], m.payload.buffer.toString("hex"));
									result.set(["reader"], m.payload);
								}

								return result;
							}));
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
