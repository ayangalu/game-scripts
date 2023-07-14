import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { HtmlTools } from '../../html-tools.mjs';
import { formatMessage } from '../../parsers/nintendo/message-studio/format.html.mjs';
import { MSBT } from '../../parsers/nintendo/message-studio/msbt.mjs';
import { Skeleton } from '../../skeleton.mjs';
import url from '../../url.mjs';
import { transformers } from './data.mjs';

export default (platform: string, entry: GameEntry, html: HtmlTools) => {
	const sourceRoot = new URL(`./source/${platform}/messages`, import.meta.url);
	const targetRoot = `display/public/games/${entry.id}`;
	const dataDir = path.join(targetRoot, 'data');
	const skeleton = new Skeleton(targetRoot);

	mkdirSync(dataDir, { recursive: true });

	for (const locale of readdirSync(sourceRoot)) {
		const result: NRecord<string, string, 3> = {};
		const languageRoot = url.join(sourceRoot, locale);

		for (const filename of readdirSync(languageRoot)) {
			if (filename.endsWith('.msbt')) {
				const decodedEntries = result[filename] ?? {};
				const msbt = new MSBT(url.join(languageRoot, filename));

				for (const entry of msbt.entries) {
					console.log(`${locale} ${filename} ${entry.label}`);

					const markup = formatMessage(entry.message, {}, transformers);

					html.validate(markup);

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
};
