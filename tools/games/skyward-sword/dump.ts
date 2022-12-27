import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { merge, mergeWith } from 'lodash';

import { HtmlTools } from '../../html-tools';
import { MSBT } from '../../parsers/nintendo/message-studio/msbt';
import { U8 } from '../../parsers/nintendo/u8';
import { data } from './data';

const htmlTools = new HtmlTools('skyward-sword');

const lineCounts: Record<string, number> = {
	de: 4,
	en: 4,
	es: 4,
	fr: 4,
	it: 4,
	ja: 3,
	ko: 3,
	nl: 4,
	ru: 4,
	zh: 3,
} as const;

[
	{
		sourceRoot: 'data/skyward-sword/messages',
		targetRoot: 'display/public/skyward-sword',
		getFormatters: data.wii,
	},
	{
		sourceRoot: 'data/skyward-sword-hd/messages',
		targetRoot: 'display/public/skyward-sword-hd',
		getFormatters: data.switch,
	},
].forEach(({ sourceRoot, targetRoot, getFormatters }) => {
	const messages = readdirSync(sourceRoot).map((locale) => {
		const languageRoot = path.join(sourceRoot, locale);
		return readdirSync(languageRoot).reduce<NRecord<string, string, 4>>((result, u8name) => {
			const u8 = new U8(path.join(languageRoot, u8name));

			u8.files
				.filter(({ name }) => name.endsWith('.msbt'))
				.forEach((file) => {
					const directory = result[file.path[0]] ?? {};
					const decodedEntries = directory[file.name] ?? {};

					const msbt = new MSBT(file.data, getFormatters(locale));

					for (const entry of msbt.entries) {
						const [text, choices] = entry.value.split(/(?=<ul>)/);

						const n = lineCounts[new Intl.Locale(locale).language];
						const lines = text.split('\n');

						let openSpan = '';

						const blocks = Array.from({ length: Math.ceil(lines.length / n) })
							.map((_, i) => {
								const group = lines
									.slice(i * n, i * n + n)
									.filter(Boolean)
									.join('\n');

								let prefix = '';
								let suffix = '';

								if (openSpan) {
									prefix = openSpan;
								}

								const spanStack =
									`${prefix}${group}`.match(/(?:<span[ a-z"=-]*?>)|(?:<\/span>)/g)?.reduce<string[]>((stack, tag) => {
										if (tag.startsWith('</')) {
											stack.shift();
										} else {
											stack.unshift(tag);
										}
										return stack;
									}, []) ?? [];

								openSpan = spanStack[0] ?? '';

								if (openSpan) {
									suffix = `</span>`;
								}

								return `${prefix}${group}${suffix}`;
							})
							.join('<hr>')
							.replace(/<hr>$/, '');

						const markup = choices ? `${blocks}<hr>${choices}` : blocks;

						if (!htmlTools.cache.includes(markup)) {
							const report = htmlTools.validate(markup);

							if (report.valid) {
								htmlTools.cache.push(markup);
							} else {
								console.log(`ERROR: ${locale} ${file.name} ${entry.label}`);
								htmlTools.persistCache();
								throw new Error(report.results[0].messages[0].message);
							}
						}

						decodedEntries[entry.label] = {
							[locale]: markup,
						};

						console.log(`${sourceRoot} ${locale} ${file.name} ${entry.label}`);
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
