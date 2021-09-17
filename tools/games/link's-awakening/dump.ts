import { execSync } from 'node:child_process';
import { readdirSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import type { Report } from 'html-validate';
import { merge } from 'lodash';

import type { NRecord } from '../../../types';
import { MSBT } from '../../parsers/nintendo/message-studio/msbt';
import { shiftFormats } from './data';

const cacheDir = `.cache/link's-awakening`;
const cacheFile = path.join(cacheDir, 'valid-html.json');

const htmlCache: string[] = (() => {
	try {
		return JSON.parse(readFileSync(cacheFile, 'utf-8'));
	} catch {
		mkdirSync(cacheDir, { recursive: true });
		return [];
	}
})();

const sourceRoot = `data/link's-awakening/messages`;
const targetRoot = `display/public/links-awakening`;

try {
	const messages = readdirSync(sourceRoot).map((locale) => {
		const languageRoot = path.join(sourceRoot, locale);
		return readdirSync(languageRoot).reduce<NRecord<string, string, 4>>(
			(result, filename) => {
				if (filename.endsWith('.msbt')) {
					const decodedEntries = result[''][filename] ?? {};
					const msbt = new MSBT(path.join(languageRoot, filename), shiftFormats);

					for (const entry of msbt.entries) {
						if (!htmlCache.includes(entry.value)) {
							const report: Report = JSON.parse(
								execSync(`node tools/validate-html.js ${JSON.stringify(entry.value)}`, { encoding: 'utf-8' }),
							);

							if (report.valid) {
								htmlCache.push(entry.value);
							} else {
								console.log(`ERROR: ${locale} ${filename} ${entry.label}`);
								throw new Error(report.results[0].messages[0].message);
							}
						}

						decodedEntries[entry.label] = {
							[locale]: entry.value,
						};

						console.log(`${sourceRoot} ${locale} ${filename} ${entry.label}`);
					}

					result[''][filename] = decodedEntries;
				}

				return result;
			},
			{ '': {} },
		);
	});

	writeFileSync(path.join(targetRoot, 'message.json'), JSON.stringify(merge({}, ...messages)));
} finally {
	writeFileSync(cacheFile, JSON.stringify(htmlCache));
}
