import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { ensure } from '@game-scripts/tools/assert.js';
import { nDict } from '@game-scripts/tools/n-dict.js';
import { MSBT } from '@game-scripts/tools/parsers/nintendo/message-studio/msbt.js';
import { formatHtml } from '@game-scripts/tools/parsers/nintendo/message-studio/util/format-html.js';
import { U8 } from '@game-scripts/tools/parsers/nintendo/u8.js';
import { Skeleton } from '@game-scripts/tools/skeleton.js';
import url from '@game-scripts/tools/url.js';

import type { DumpFunction } from '../../../cli/dump.js';
import { buildTransformers } from './data.js';

export const dump: DumpFunction = ({ platform, html, targetDir, dataDir }) => {
	const sourceRoot = new URL(`./source/${platform}/messages`, import.meta.url);
	const skeleton = new Skeleton(targetDir, {
		'word.msbt': (target, source, merge) => {
			return Object.fromEntries(Object.entries(merge(target, source)).sort((a, b) => a[0].localeCompare(b[0], 'en-US')));
		},
	});

	mkdirSync(dataDir, { recursive: true });

	const getTransformers = buildTransformers(sourceRoot, platform);

	for (const locale of readdirSync(sourceRoot)) {
		const result = nDict<4, string>();
		const languageRoot = url.join(sourceRoot, locale);
		const transformers = getTransformers(locale);

		for (const folderName of readdirSync(languageRoot)) {
			const u8 = new U8(url.join(languageRoot, folderName));

			u8.files
				.filter(({ name }) => name.endsWith('.msbt'))
				.forEach((file) => {
					const msbt = new MSBT(file.data);

					for (const entry of msbt.entries) {
						console.log(`${sourceRoot} ${locale} ${file.name} ${entry.label}`);

						const markup = formatHtml(entry.message, {}, transformers).replaceAll(/\n{3,}/gu, '\n\n');

						html.validate(markup);

						result.set([ensure(file.path[0]), file.name, entry.label, locale], markup);
					}
				});
		}

		skeleton.update(result.source);

		writeFileSync(path.join(dataDir, `${locale}.json`), JSON.stringify(result.source));
	}

	skeleton.persist();
};
