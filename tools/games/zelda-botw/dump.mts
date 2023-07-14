import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { HtmlTools } from '../../html-tools.mjs';
import type { Message } from '../../parsers/nintendo/message-studio/msbt.mjs';
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
		const result: NRecord<string, string, 4> = {};
		const languageRoot = url.join(sourceRoot, locale);

		for (const folderName of readdirSync(languageRoot)) {
			const msbtRoot = url.join(languageRoot, folderName);

			for (const fileName of readdirSync(msbtRoot)) {
				console.log(`${locale} ${folderName} ${fileName}`);

				const msbt = new MSBT(url.join(msbtRoot, fileName));

				const format = (message: Message) => {
					message.reader.seek(0);
					return formatMessage(
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
					const folder = result[folderName] ?? {};
					const file = folder[fileName] ?? {};
					const messages = file[entry.label] ?? {};

					const markup = format(entry.message);

					html.validate(markup);

					messages[locale] = markup;
					file[entry.label] = messages;
					folder[fileName] = file;
					result[folderName] = folder;
				}
			}
		}

		skeleton.update(result);
		writeFileSync(path.join(dataDir, `${locale}.json`), JSON.stringify(result));
	}

	skeleton.persist();
};
