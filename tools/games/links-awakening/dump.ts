import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { merge } from 'lodash';

import type { NRecord } from '../../../types';
import { MSBT } from '../../parsers/nintendo/message-studio/msbt';
import { shiftFormats } from './data';
import { HtmlTools } from '../../html-tools';

const htmlTools = new HtmlTools('links-awakening');

const sourceRoot = `data/links-awakening/messages`;
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
						if (!htmlTools.cache.includes(entry.value)) {
							const report = htmlTools.validate(entry.value);

							if (report.valid) {
								htmlTools.cache.push(entry.value);
							} else {
								console.log(`ERROR: ${locale} ${filename} ${entry.label}`);
								htmlTools.persistCache();
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
	htmlTools.persistCache();
}
