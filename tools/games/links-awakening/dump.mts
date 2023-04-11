import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { HtmlTools } from '../../html-tools.mjs';
import { formatMessage } from '../../parsers/nintendo/message-studio/format.html.mjs';
import { MSBT } from '../../parsers/nintendo/message-studio/msbt.mjs';
import { Skeleton } from '../../skeleton.mjs';
import { transformers } from './data.mjs';

const htmlTools = new HtmlTools('links-awakening');

const sourceRoot = `data/links-awakening/messages`;
const targetRoot = `display/public/links-awakening`;

try {
	const dataDir = path.join(targetRoot, 'data');
	const skeleton = new Skeleton(dataDir);

	for (const locale of readdirSync(sourceRoot)) {
		const result: NRecord<string, string, 3> = {};
		const languageRoot = path.join(sourceRoot, locale);

		for (const filename of readdirSync(languageRoot)) {
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
		}

		skeleton.update(result);
		writeFileSync(path.join(dataDir, `${locale}.json`), JSON.stringify(result));
	}

	skeleton.persist();
} finally {
	htmlTools.persistCache();
}
