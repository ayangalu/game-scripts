import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { parse as csvParse } from 'csv-parse/sync';

import type { Alignment } from './alignments';
import { SerializedFile } from '../../parsers/unity/serialized-file';
import { fieldAlignment, ragtimeAlignment, ragtimeFiles } from './alignments';
import { eventMessageMap, mogIconOpCode } from './assembly-data';

const assetsRoot = `data/final-fantasy-9/extract/embeddedasset`;
const textRoot = path.join(assetsRoot, 'text');

try {
	readdirSync(textRoot);
} catch {
	new SerializedFile(`data/final-fantasy-9/data/mainData`).extractResources(
		`data/final-fantasy-9/extract`,
		(resourcePath) =>
			resourcePath.startsWith('embeddedasset') && ['', '.txt', '.mes'].includes(path.extname(resourcePath)),
	);
}

export const raw = readdirSync(textRoot).reduce<NRecord<string, string, 3>>((result, locale) => {
	const categories: NRecord<string, string, 2> = Object.create(null);

	readdirSync(path.join(textRoot, locale)).forEach((category) => {
		const messages: Record<string, string> = Object.create(null);

		readdirSync(path.join(textRoot, locale, category)).forEach((file) => {
			const message = readFileSync(path.join(textRoot, locale, category, file), 'utf-8');
			messages[file] = message;
		});

		categories[category] = messages;
	});

	result[locale] = categories;

	return result;
}, Object.create(null));

const localeMap: Record<string, string> = {
	es: 'es-ES',
	fr: 'fr-FR',
	gr: 'de-DE',
	it: 'it-IT',
	jp: 'ja-JP',
	uk: 'en-GB',
	us: 'en-US',
};

const align = (source: Record<string, string[]>, data: Alignment): Array<Record<string, string>> => {
	const rows = Array.from({ length: data.max }).map((_, index) =>
		Object.entries(source).reduce<Record<string, string>>((result, [locale, messages]) => {
			const l = localeMap[locale];
			if (data.blanks?.[locale]?.includes(index)) {
				result[l] = '';
			} else {
				result[l] = messages.shift() ?? '';
			}

			return result;
		}, Object.create(null)),
	);

	Object.keys(source).forEach((locale) => {
		data.swap?.[locale]?.forEach(([a, b]) => {
			const l = localeMap[locale];
			[rows[a][l], rows[b][l]] = [rows[b][l], rows[a][l]];
		});
	});

	return rows.filter((row) => Object.values(row).some((message) => message.trim()));
};

type SimpleSplitResult = Record<string, Array<Record<string, string>>>;

const simpleSplit = (source: string) =>
	Object.keys(raw.jp[source]).reduce<SimpleSplitResult>((result, file) => {
		const main = result[file] ?? [];

		Object.keys(raw).forEach((locale) => {
			raw[locale][source][file].split(/(?<=\[ENDN\])/).forEach((name, index) => {
				const row = main[index] ?? {};
				row[localeMap[locale]] = (
					file === 'follow.mes' && index >= 8 ? name.slice(1).replace(/%|&/, `[CARD]`) : name
				).replaceAll('\r\n', '\n');
				main[index] = row;
			});
		});

		result[file] = main;

		return result;
	}, Object.create(null));

const fieldOrder = [1, ...new Set(Object.values(eventMessageMap))];

export const aligned = {
	system: {
		system: (
			csvParse(readFileSync(path.join(assetsRoot, 'manifest/text/localization.txt')), {
				skipEmptyLines: true,
				skipRecordsWithEmptyValues: true,
				relaxColumnCount: true,
				cast: (value) => value.replaceAll('\\n', '\n').replaceAll('{0}', '[CARD]'),
			}) as string[][]
		)
			.slice(1)
			.reduce<NRecord<string, string, 2>>((result, [key, ...data]) => {
				result[key] = {
					'en-US': data[0] ?? '',
					'en-GB': data[1] ?? '',
					'ja-JP': data[2] ?? '',
					'es-ES': data[3] ?? '',
					'fr-FR': data[4] ?? '',
					'de-DE': data[5] ?? '',
					'it-IT': data[6] ?? '',
				};

				return result;
			}, Object.create(null)),
	},
	field: Object.fromEntries(
		Object.keys(raw.jp.field)
			.map((file) => {
				const data = Object.keys(raw).reduce<Record<string, string[]>>((result, locale) => {
					const messages = raw[locale].field[file];

					if (messages) {
						result[locale] = Object.entries(mogIconOpCode)
							.reduce((result, [source, replacer]) => {
								return result.replaceAll(source, replacer);
							}, messages)
							.split(/(?<=\[(?:ENDN|TIME=-?\d+?)\])/)
							.map((message) => message.replaceAll('\r\n', '\n'));
					}

					return result;
				}, Object.create(null));

				if (file in fieldAlignment) {
					return [file, align(data, fieldAlignment[file])] as const;
				}

				return [file, align(data, { max: data.jp.length })] as const;
			})
			.sort(([a], [b]) => {
				const lookup = (value: string) => (id: number) => new RegExp(`^${id}m?\\.mes$`).test(value);
				return fieldOrder.findIndex(lookup(a)) - fieldOrder.findIndex(lookup(b));
			}),
	),
	item: simpleSplit('item'),
	keyitem: simpleSplit('keyitem'),
	ability: simpleSplit('ability'),
	command: simpleSplit('command'),
	battle: Object.fromEntries(
		Object.keys(raw.jp.battle)
			.filter((file) => file.endsWith('.mes'))
			.map((file) => {
				const data = Object.keys(raw).reduce<Record<string, string[]>>((result, locale) => {
					result[locale] = raw[locale].battle[file].split(/(?<=\[ENDN\])/);
					return result;
				}, Object.create(null));

				if (ragtimeFiles.includes(file)) {
					return [file, align(data, ragtimeAlignment)] as const;
				}

				return [file, align(data, { max: data.jp.length })] as const;
			})
			.sort(([a], [b]) => a.localeCompare(b, 'en-US', { numeric: true })),
	),
	location: {
		'loc_name.mes': Object.keys(raw).reduce<NRecord<string, string, 2>>((result, locale) => {
			raw[locale].location['loc_name.mes']
				.split(/(?<=\[ENDN\]\r\n)/)
				.sort((a, b) => a.localeCompare(b, 'en-US', { numeric: true }))
				.forEach((value) => {
					const [index, name] = value.split(':');
					const data = result[index] ?? {};
					data[localeMap[locale]] = name.trim();
					result[index] = data;
				});

			return result;
		}, Object.create(null)),
	},
	etc: simpleSplit('etc'),
	title: {
		warning: [
			Object.keys(raw).reduce<Record<string, string>>((result, locale) => {
				result[localeMap[locale]] = raw[locale].title.warning.trim().replaceAll('\r\n', '\n');
				return result;
			}, Object.create(null)),
		],
	},
};
