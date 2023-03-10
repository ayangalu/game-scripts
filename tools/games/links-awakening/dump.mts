import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { merge } from 'lodash-es';

import { HtmlTools } from '../../html-tools.mjs';
import { formatMessage } from '../../parsers/nintendo/message-studio/format.html.mjs';
import { MSBT } from '../../parsers/nintendo/message-studio/msbt.mjs';
import { transformers } from './data.mjs';

const htmlTools = new HtmlTools('links-awakening');

const sourceRoot = `data/links-awakening/messages`;
const targetRoot = `display/public/links-awakening`;

try {
	const messages = readdirSync(sourceRoot).map((locale) => {
		const languageRoot = path.join(sourceRoot, locale);
		return readdirSync(languageRoot).reduce<NRecord<string, string, 3>>((result, filename) => {
			if (filename.endsWith('.msbt')) {
				const decodedEntries = result[filename] ?? {};
				const msbt = new MSBT(path.join(languageRoot, filename));

				for (const entry of msbt.entries) {
					console.log(`${locale} ${filename} ${entry.label}`);

					const markup = formatMessage(entry.message, {}, transformers);

					if (!htmlTools.cache.includes(markup)) {
						const report = htmlTools.validate(markup);

						if (report.valid) {
							htmlTools.cache.push(markup);
						} else {
							console.log(`ERROR: ${locale} ${filename} ${entry.label}`);
							htmlTools.persistCache();
							throw new Error(report.results[0].messages[0].message);
						}
					}

					decodedEntries[entry.label] = {
						[locale]: markup,
					};
				}

				result[filename] = decodedEntries;
			}

			return result;
		}, {});
	});

	writeFileSync(path.join(targetRoot, 'message.json'), JSON.stringify(merge({}, ...messages)));
} finally {
	htmlTools.persistCache();
}
