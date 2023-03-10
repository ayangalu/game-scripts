import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { Message } from '../../parsers/nintendo/message-studio/msbt.mjs';
import { HtmlTools } from '../../html-tools.mjs';
import { formatMessage } from '../../parsers/nintendo/message-studio/format.html.mjs';
import { MSBT } from '../../parsers/nintendo/message-studio/msbt.mjs';
import { transformers } from './data.mjs';

const htmlTools = new HtmlTools('breath-of-the-wild');

const sourceRoot = `data/breath-of-the-wild/messages`;
const targetRoot = `display/public/breath-of-the-wild`;

try {
	const result: NRecord<string, string, 4> = {};

	for (const locale of readdirSync(sourceRoot)) {
		const languageRoot = path.join(sourceRoot, locale);

		for (const folderName of readdirSync(languageRoot)) {
			const msbtRoot = path.join(languageRoot, folderName);

			for (const fileName of readdirSync(msbtRoot)) {
				console.log(`${locale} ${folderName} ${fileName}`);

				const msbt = new MSBT(path.join(msbtRoot, fileName));

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

					if (!htmlTools.cache.includes(markup)) {
						const report = htmlTools.validate(markup);

						if (report.valid) {
							htmlTools.cache.push(markup);
						} else {
							console.log(`ERROR: ${locale} ${folderName} ${fileName} ${entry.label}`);
							throw new Error(report.results[0].messages[0].message);
						}
					}

					messages[locale] = markup;
					file[entry.label] = messages;
					folder[fileName] = file;
					result[folderName] = folder;
				}
			}
		}
	}

	writeFileSync(path.join(targetRoot, 'message.json'), JSON.stringify(result));
} finally {
	htmlTools.persistCache();
}
