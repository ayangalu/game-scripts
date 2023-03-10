import { readdirSync } from 'node:fs';

import { controlCodes, readMSBT } from '../../parsers/nintendo/message-studio/inspect.mjs';
import { MSBP } from '../../parsers/nintendo/message-studio/msbp.mjs';

const root = `data/links-awakening/messages`;
const locales = readdirSync(root);

const msbp = Object.fromEntries(locales.map((locale) => [locale, new MSBP(`${root}/${locale}/richard.msbp`)] as const));
const msbt = readMSBT(root);

const result = controlCodes(msbt, {
	ignore: {
		0: [
			0, // ruby
			2, // font size
		],
		1: [
			11, // sound effect
			13, // fade in
			14, // fade out,
			15, // quake (maybe shaking message box?)
			16, // lump (no idea what this is)
		],
	},
});

debugger;

// const inconsistent = Object.entries(msbt).reduce<NRecord<string, Array<string | ShiftControl>, 3>>(
// 	(result, [locale, files]) => {
// 		Object.entries(files).forEach(([filename, msbt]) => {
// 			const indices = msbt.blocks.TXT2?.map((message, blockIndex) => {
// 				return message.findIndex((part, messageIndex) => {
// 					if (typeof part === 'object' && part.group === 1 && part.tag === 4) {
// 						const next = message[messageIndex + 1];
// 						if ((typeof next === 'object' && next.tag !== 4) || (typeof next === 'string' && next[0] !== '\n')) {
// 							return true;
// 						}
// 					}

// 					return false;
// 				}) >= 0
// 					? blockIndex
// 					: null;
// 			}).filter((x): x is number => typeof x === 'number');

// 			if (indices?.length) {
// 				const mappedFiles = result[locale] ?? {};
// 				mappedFiles[filename] = Object.fromEntries(
// 					indices.map((index) => {
// 						return [msbt.blocks.LBL1?.[index], msbt.blocks.TXT2?.[index]];
// 					}),
// 				);
// 				result[locale] = mappedFiles;
// 			}
// 		});

// 		return result;
// 	},
// 	{},
// );

// debugger;
