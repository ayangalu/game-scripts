import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { HtmlTools } from '../../html-tools.mjs';
import { formatMessage } from '../../parsers/nintendo/message-studio/format.html.mjs';
import { MSBT } from '../../parsers/nintendo/message-studio/msbt.mjs';
import { U8 } from '../../parsers/nintendo/u8.mjs';
import { Skeleton } from '../../skeleton.mjs';
import url from '../../url.mjs';
import { buildTransformers } from './data.mjs';

export default (platform: string, entry: GameEntry, html: HtmlTools) => {
	const sourceRoot = new URL(`./source/${platform}/messages`, import.meta.url);
	const targetRoot = `display/public/games/${entry.id}`;
	const dataDir = path.join(targetRoot, 'data');
	const skeleton = new Skeleton(targetRoot, {
		'word.msbt': (target, source, merge) => {
			return Object.fromEntries(Object.entries(merge(target, source)).sort((a, b) => a[0].localeCompare(b[0], 'en-US')));
		},
	});

	mkdirSync(dataDir, { recursive: true });

	const getTransformers = buildTransformers(sourceRoot);

	for (const locale of readdirSync(sourceRoot)) {
		const result: NRecord<string, string, 4> = {};
		const languageRoot = url.join(sourceRoot, locale);
		const transformers = getTransformers(locale);

		for (const folderName of readdirSync(languageRoot)) {
			const u8 = new U8(url.join(languageRoot, folderName));

			u8.files
				.filter(({ name }) => name.endsWith('.msbt'))
				.forEach((file) => {
					const directory = result[file.path[0]] ?? {};
					const decodedEntries = directory[file.name] ?? {};

					const msbt = new MSBT(file.data);

					for (const entry of msbt.entries) {
						console.log(`${sourceRoot} ${locale} ${file.name} ${entry.label}`);

						const markup = formatMessage(entry.message, {}, transformers).replaceAll(/\n{3,}/gu, '\n\n');

						html.validate(markup);

						decodedEntries[entry.label] = {
							[locale]: markup,
						};
					}

					directory[file.name] = decodedEntries;
					result[file.path[0]] = directory;
				});
		}

		skeleton.update(result);

		writeFileSync(path.join(dataDir, `${locale}.json`), JSON.stringify(result));
	}

	skeleton.persist();
};
