import { readdirSync } from 'node:fs';

import { controlCodes, readMSBT } from '../../parsers/nintendo/message-studio/inspect';
import { MSBP } from '../../parsers/nintendo/message-studio/msbp';

const root = `data/link's-awakening/messages`;
const locales = readdirSync(root);

const msbp = Object.fromEntries(locales.map((locale) => [locale, new MSBP(`${root}/${locale}/richard.msbp`)] as const));
const msbt = readMSBT(root);

const result = controlCodes(msbt, {
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
});

void 0;
