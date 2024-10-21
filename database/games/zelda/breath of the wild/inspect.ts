import type { BinaryReader } from '@nishin/reader';
import { DataType, Encoding } from '@nishin/reader';

import type { MessageTree } from '@game-scripts/tools/parsers/nintendo/message-studio/util/inspect.js';
import { hex } from '@game-scripts/tools/format.js';
import { MSBT } from '@game-scripts/tools/parsers/nintendo/message-studio/msbt.js';
import { controlCodes, readMSBT } from '@game-scripts/tools/parsers/nintendo/message-studio/util/inspect.js';

const sources = readMSBT(
	new URL(`./source/switch/messages`, import.meta.url) /* , ({ pathname }) =>
	pathname.includes('en-US'), */,
);

const placeholderSymbol = (payload: BinaryReader<Buffer>) => {
	const value = payload.next(DataType.Uint16);
	const symbol = payload.next(DataType.string(Encoding.UTF16));
	return `${hex(value, 4)} ${symbol}`;
};

const pluralVariants = (payload: BinaryReader<Buffer>) => {
	let count = payload.next(DataType.Uint16) / 2;
	const var1 = payload.next(DataType.string(Encoding.UTF16, { count }));
	count = payload.next(DataType.Uint16) / 2;
	const var2 = payload.next(DataType.string(Encoding.UTF16, { count }));
	count = payload.next(DataType.Uint16) / 2;
	const var3 = payload.next(DataType.string(Encoding.UTF16, { count }));
	return `'${var1}' '${var2}' '${var3}'`;
};

const codes = controlCodes(sources, {
	ignore: {
		0: [
			0, // ruby
			2, // font size
			// 3, // text color
			// 4, // explicit page break
		],
		1: [
			0, // pause or text speed ?
			1, // ?
			2, // square dialog box ?
			3, // ?
			4, // 2 choices
			5, // 3 choices
			6, // 4 choices
			// 7, // emoji
			10, // single "choice"
		],
		3: [
			1, // sound ?
		],
		4: [0, 1, 2, 3], // ?
		5: [0, 1, 2], // text pauses ?
		// 201: [4], // ?
	},
	formatPayload: {
		2: {
			1: placeholderSymbol,
			2: placeholderSymbol,
			9: placeholderSymbol,
			11: placeholderSymbol,
			12: placeholderSymbol,
			14: placeholderSymbol,
			15: placeholderSymbol,
			16: placeholderSymbol,
			17: placeholderSymbol,
			18: placeholderSymbol,
			19: placeholderSymbol,
		},
		4: {
			0: placeholderSymbol,
			2: placeholderSymbol,
		},
		201: {
			5: pluralVariants,
			6: pluralVariants,
		},
	},
});

const find = (text: string, locale = 'en-US') => {
	const results: string[] = [];

	const process = (path: string, tree: MessageTree) => {
		for (const [key, node] of Object.entries(tree)) {
			if (node instanceof MSBT) {
				for (const entry of node.entries) {
					if (entry.text.includes(text)) {
						results.push(`${path}/${key}:${entry.label}`);
					}
				}
			} else {
				process(`${path}/${key}`, node);
			}
		}
	};

	process('', sources[locale]!);

	return results;
};

const getName = (file: string, locale = 'en-US') => {
	return ((sources[locale]!.ActorType as MessageTree)['NPC.msbt'] as MSBT).entries.find(({ label }) =>
		label.startsWith(file),
	);
};

// const capitalizationFollows = Object.entries(codes[14][201][3]['']).reduce((result, [locale, value]) => {
// 	Object.entries(value).forEach(([kx, vx]) => {
// 		Object.entries(vx).forEach(([ky, vy]) => {
// 			const index = vy.findIndex((z: any) => typeof z === 'object' && z.group === 201 && z.tag === 3);
// 			if ((vy[index + 1] as any).group !== 201) {
// 				result[`${locale} ${kx} ${ky}`] = vy;
// 			}
// 		});
// 	});

// 	return result;
// }, Object.create(null, {}));

debugger;
