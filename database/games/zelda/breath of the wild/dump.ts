import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { Message } from '@game-scripts/tools/parsers/nintendo/message-studio/msbt.js';
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

	mkdirSync(dataDir, { recursive: true });

	for (const locale of readdirSync(sourceRoot)) {
		const result = nDict<4, string>();
		const languageRoot = url.join(sourceRoot, locale);

		for (const folderName of readdirSync(languageRoot)) {
			const msbtRoot = url.join(languageRoot, folderName);

			for (const fileName of readdirSync(msbtRoot)) {
				console.log(`${locale} ${folderName} ${fileName}`);

				const msbt = new MSBT(url.join(msbtRoot, fileName));

				const format = (message: Message) => {
					message.reader.seek(0);
					return formatHtml(
						message,
						{
							locale,
							source: msbt,
							format,
						},
						transformers,
					);
				};

				for (const entry of msbt.entries) {
					const markup = format(entry.message);
					html.validate(markup);
					result.set([folderName, fileName, entry.label, locale], markup);
				}
			}
		}

		skeleton.update(result.source);
		writeFileSync(path.join(dataDir, `${locale}.json`), JSON.stringify(result.source));
	}

	skeleton.persist();
};
