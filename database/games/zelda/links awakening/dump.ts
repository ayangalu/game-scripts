import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { nDict } from '@game-scripts/tools/n-dict.js';
import { MSBT } from '@game-scripts/tools/parsers/nintendo/message-studio/msbt.js';
import { formatHtml } from '@game-scripts/tools/parsers/nintendo/message-studio/util/format-html.js';
import { Skeleton } from '@game-scripts/tools/skeleton.js';
import url from '@game-scripts/tools/url.js';

import type { DumpFunction } from '../../../cli/dump.js';
import { transformers } from './data.js';

export const dump: DumpFunction = ({ platform, html, targetDir, dataDir }) => {
	const sourceRoot = new URL(`./source/${platform}/messages`, import.meta.url);
	const skeleton = new Skeleton(targetDir);

	for (const locale of readdirSync(sourceRoot)) {
		const result = nDict<3, string>();
		const languageRoot = url.join(sourceRoot, locale);

		for (const filename of readdirSync(languageRoot)) {
			if (filename.endsWith('.msbt')) {
				const msbt = new MSBT(url.join(languageRoot, filename));

				for (const entry of msbt.entries) {
					console.log(`${locale} ${filename} ${entry.label}`);

					const markup = formatHtml(entry.message, {}, transformers);

					html.validate(markup);

					result.set([filename, entry.label, locale], markup);
				}
			}
		}

		skeleton.update(result.source);
		writeFileSync(path.join(dataDir, `${locale}.json`), JSON.stringify(result.source));
	}

	skeleton.persist();
};
