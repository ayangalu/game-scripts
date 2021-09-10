import { readdirSync } from 'node:fs';

import { controlCodes, readMSBT } from '../../parsers/nintendo/message-studio/inspect';
import { MSBP } from '../../parsers/nintendo/message-studio/msbp';

const root = `data/link's-awakening/messages`;
const locales = readdirSync(root);

const msbp = Object.fromEntries(locales.map((locale) => [locale, new MSBP(`${root}/${locale}/richard.msbp`)] as const));
const msbt = readMSBT(root);

const result = controlCodes(msbt);

void 0;
