import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { merge, mergeWith } from 'lodash-es';

import { HtmlTools } from '../../html-tools.mjs';
import { formatMessage } from '../../parsers/nintendo/message-studio/format.html.mjs';
import { MSBT } from '../../parsers/nintendo/message-studio/msbt.mjs';
import { U8 } from '../../parsers/nintendo/u8.mjs';
import { data } from './data.mjs';

const htmlTools = new HtmlTools('skyward-sword');

[
	{
		sourceRoot: 'data/skyward-sword/messages',
		targetRoot: 'display/public/skyward-sword',
		getTransformers: data.wii,
	},
	{
		sourceRoot: 'data/skyward-sword-hd/messages',
		targetRoot: 'display/public/skyward-sword-hd',
		getTransformers: data.switch,
	},
].forEach(({ sourceRoot, targetRoot, getTransformers }) => {
	const messages = readdirSync(sourceRoot).map((locale) => {
		const languageRoot = path.join(sourceRoot, locale);
		const transformers = getTransformers(locale);
		return readdirSync(languageRoot).reduce<NRecord<string, string, 4>>((result, u8name) => {
			const u8 = new U8(path.join(languageRoot, u8name));

			u8.files
				.filter(({ name }) => name.endsWith('.msbt'))
				.forEach((file) => {
					const directory = result[file.path[0]] ?? {};
					const decodedEntries = directory[file.name] ?? {};

					const msbt = new MSBT(file.data);

					for (const entry of msbt.entries) {
						console.log(`${sourceRoot} ${locale} ${file.name} ${entry.label}`);

						const markup = formatMessage(entry.message, {}, transformers).replaceAll(/\n{3,}/gu, '\n\n');

						if (!htmlTools.cache.includes(markup)) {
							const report = htmlTools.validate(markup);

							if (report.valid) {
								htmlTools.cache.push(markup);
							} else {
								htmlTools.persistCache();
								throw new Error(report.results[0].messages[0].message);
							}
						}

						decodedEntries[entry.label] = {
							[locale]: markup,
						};
					}

					directory[file.name] = decodedEntries;
					result[file.path[0]] = directory;
				});

			return result;
		}, {});
	});

	writeFileSync(
		path.join(targetRoot, 'message.json'),
		JSON.stringify(
			mergeWith({}, ...messages, (target: NRecord<string, string, 2>, source: NRecord<string, string, 2>, key: string) => {
				if (key === 'word.msbt' && target && source) {
					return Object.fromEntries(Object.entries(merge(target, source)).sort((a, b) => a[0].localeCompare(b[0], 'en-US')));
				}
			}),
		),
	);
});

htmlTools.persistCache();
