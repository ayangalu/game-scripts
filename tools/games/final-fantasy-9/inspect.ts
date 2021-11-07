import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import stringify from 'csv-stringify/lib/sync';

import { NRecord } from '../../../types';

import { aligned, raw } from './load-messages';
import { eventMessageMap } from './assembly-data';

// import { SerializedFile } from '../../parsers/unity/serialized-file';

// const main = new SerializedFile(`data/final-fantasy-9/serialized/mainData`);

// main.extractResources(
// 	`data/final-fantasy-9/extract`,
// 	(resourcePath) =>
// 		resourcePath.startsWith('embeddedasset') &&
// 		['', '.csv', '.txt', '.mes', '.list'].includes(path.extname(resourcePath)),
// );

void aligned, eventMessageMap;

const assetsRoot = `data/final-fantasy-9/extract/embeddedasset`;
const textRoot = path.join(assetsRoot, 'text');

const messages = readdirSync(textRoot).reduce(
	(result, locale) => {
		// @ts-expect-error
		const categories: NRecord<string, string, 2> = { __proto__: null };

		readdirSync(path.join(textRoot, locale)).forEach((category) => {
			// @ts-expect-error
			const messages: Record<string, string> = { __proto__: null };

			readdirSync(path.join(textRoot, locale, category)).forEach((file) => {
				const message = readFileSync(path.join(textRoot, locale, category, file), 'utf-8');
				messages[file] = message;
			});

			categories[category] = messages;
		});

		result[locale] = categories;

		return result;
	},
	// @ts-expect-error
	{
		__proto__: null,
	} as NRecord<string, string, 3>,
);

// const locales = Object.keys(messages);
// const categories = Object.keys(messages.es);

// const fileNames = new Map<string, string>();

// categories.forEach((category) =>
// 	locales.forEach((locale) => {
// 		const files = JSON.stringify(Object.keys(messages[locale][category]).filter((f) => f.endsWith('.mes')));
// 		const cache = fileNames.get(category);

// 		if (cache && cache !== files) {
// 			throw new Error();
// 		}

// 		fileNames.set(category, files);
// 	}),
// );

const [tags, qualifiers] = Object.entries(messages).reduce<[Record<string, any>, Record<string, any>]>(
	([tags, qualifiers], [locale, categories]) => {
		Object.entries(categories).forEach(([category, files]) => {
			Object.entries(files).forEach(([file, message]) => {
				const destination = `${locale}/${category}/${file}`;
				const codes = new Set([...message.matchAll(/\[(.+?)\]/g)].map(([_, code]) => code));
				codes.forEach((code) => {
					const tagMatch = code.match(/([A-Z]{3}[A-Z0-9])(?:=(.+))?/);

					if (tagMatch) {
						const [_, tagName, option] = tagMatch;
						const tag = tags[tagName] ?? {};
						const destinations = tag[option ?? ''] ?? {};
						destinations[destination] = message;
						tag[option ?? ''] = destinations;
						tags[tagName] = tag;
					} else {
						const qualifier = qualifiers[code] ?? {};
						qualifier[destination] = message;
						qualifiers[code] = qualifier;
					}
				});
			});
		});

		return [tags, qualifiers];
	},
	[{}, {}],
);

const find = (text: string) => {
	Object.entries(messages).forEach(([locale, categories]) =>
		Object.entries(categories).forEach(([category, files]) =>
			Object.entries(files).forEach(([file, message]) => {
				if (message.includes(text)) {
					console.log(locale, category, file);
				}
			}),
		),
	);
};

const field2 = stringify(
	Object.entries(messages).reduce<string[][]>((rows, [locale, { field }], columnIndex) => {
		const headerRow = rows[0] ?? [];
		headerRow[columnIndex] = locale;
		field['2.mes'].split(/\[ENDN\]|(?<=\[TIME=-?\d+?\])/).forEach((message, rowIndex) => {
			const row = rows[rowIndex + 1] ?? [];
			row[columnIndex] = message;
			rows[rowIndex + 1] = row;
		});
		rows[0] = headerRow;
		return rows;
	}, []),
	{ delimiter: '\t' },
);

const checks: Record<string, Record<string, number>> = {};

const tables = Object.entries(messages).reduce<Record<string, string[][]>>((result, [locale, groups], columnIndex) => {
	Object.entries(groups).forEach(([group, files]) => {
		Object.entries(files).forEach(([file, data]) => {
			const entryPath = `${group}/${path.basename(file, '.mes')}.csv`;
			const table = result[entryPath] ?? [];

			const entries = data.split(/(?<=\[(?:ENDN|TIME=-?\d+?)\])/);

			const check = checks[entryPath] ?? {};
			check[locale] = entries.length;
			checks[entryPath] = check;

			entries.forEach((message, rowIndex) => {
				const row = table[rowIndex] ?? [];
				row[columnIndex] = message;
				table[rowIndex] = row;
			});

			result[entryPath] = table;
		});
	});

	return result;
}, {});

// Object.entries(tables).forEach(([entryPath, table]) => {
// 	const targetPath = path.join(`data/final-fantasy-9/csv`, entryPath);
// 	mkdirSync(path.dirname(targetPath), { recursive: true });
// 	writeFileSync(targetPath, stringify(table, { delimiter: '\t' }));
// });

void 0;
