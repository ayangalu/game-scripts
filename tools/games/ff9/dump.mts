import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { HtmlTools } from '../../html-tools.mjs';
import { Skeleton } from '../../skeleton.mjs';
import { iconMap } from './assembly-data.mjs';
import { aligned, localeMap } from './load-messages.mjs';

type Transformer = (data: { openMarkupTags: string[]; locale: string; parameters: string[] }) => string;

const htmlTools = new HtmlTools('final-fantasy-9');

const buttonLookup = (type: 'joy' | 'key', id: string, locale = 'ja-JP') => {
	switch (id) {
		case 'UP':
			return ['d-pad up'];
		case 'DOWN':
			return ['d-pad down'];
		case 'LEFT':
			return ['d-pad left'];
		case 'RIGHT':
			return ['d-pad right'];
		case 'PAD':
			return ['d-pad'];
		case 'SELECT':
			return type === 'key' ? ['default', '1'] : ['select'];
		case 'START':
			return type === 'key' ? ['backspace'] : ['start'];
		case 'CIRCLE':
			return locale === 'ja-JP'
				? type === 'key'
					? ['default', 'X']
					: ['button b']
				: type === 'key'
				? ['default', 'C']
				: ['button a'];
		case 'CROSS':
			return locale === 'ja-JP'
				? type === 'key'
					? ['default', 'C']
					: ['button a']
				: type === 'key'
				? ['default', 'X']
				: ['button b'];
		case 'TRIANGLE':
			return type === 'key' ? ['default', 'V'] : ['button y'];
		case 'SQUARE':
			return type === 'key' ? ['default', 'B'] : ['button x'];
		case 'R1':
			return type === 'key' ? ['default', 'H'] : ['button r1'];
		case 'R2':
			return type === 'key' ? ['default', 'J'] : ['button r2'];
		case 'L1':
			return type === 'key' ? ['default', 'G'] : ['button l1'];
		case 'L2':
			return type === 'key' ? ['default', 'F'] : ['button l2'];
	}

	throw new Error(`unexpected button`);
};

const closeHTML = (tags: string[]) => {
	const result = tags.map((tag) => `</${tag}>`).join('');
	tags.length = 0;
	return result;
};

const colorStart =
	(color: string): Transformer =>
	({ openMarkupTags }) => {
		const result = `${closeHTML(openMarkupTags)}<span class="color ${color}">`;
		openMarkupTags.unshift('span');
		return result;
	};

const transformers: Partial<Record<string, Transformer>> = {
	'B880E0': colorStart('pink'),
	'68C0D8': colorStart('cyan'),
	'D06050': colorStart('gold'),
	'C8B040': colorStart('yellow'),
	'78C840': colorStart('green'),
	'909090': colorStart('grey'),
	'A85038': colorStart('brown'),
	'383838': ({ openMarkupTags }) => closeHTML(openMarkupTags),
	'C8C8C8': ({ openMarkupTags }) => closeHTML(openMarkupTags),
	'CARD': () => `<span class="placeholder">#</span>`,
	'ZDNE': () => `<player-name character="ff9:zidane"></player-name>`,
	'VIVI': () => `<player-name character="ff9:vivi"></player-name>`,
	'DGGR': () => `<player-name character="ff9:dagger"></player-name>`,
	'STNR': () => `<player-name character="ff9:steiner"></player-name>`,
	'FRYA': () => `<player-name character="ff9:freya"></player-name>`,
	'QUIN': () => `<player-name character="ff9:quina"></player-name>`,
	'EIKO': () => `<player-name character="ff9:eiko"></player-name>`,
	'AMRT': () => `<player-name character="ff9:amarant"></player-name>`,
	'PTY1': () => `<span class="placeholder">1</span>`,
	'PTY2': () => `<span class="placeholder">2</span>`,
	'PTY3': () => `<span class="placeholder">3</span>`,
	'PTY4': () => `<span class="placeholder">4</span>`,
	'DBTN': ({ locale, parameters: [id] }) => `<span class="controller ${buttonLookup('joy', id, locale)[0]}"></span>`,
	'CBTN': ({ locale, parameters: [id] }) => `<span class="controller ${buttonLookup('joy', id, locale)[0]}"></span>`,
	'JCBT': ({ locale, parameters: [id] }) => `<span class="controller ${buttonLookup('joy', id, locale)[0]}"></span>`,
	'KCBT': ({ locale, parameters: [id] }) => {
		const [style, content = ''] = buttonLookup('key', id, locale);
		return `<span class="keyboard ${style}">${content}</span>`;
	},
	'MOVE': () => `\t`,
	'TEXT': ({ parameters: [_, id] }) => `<span class="placeholder">${id}</span>`,
	'ITEM': ({ parameters: [id] }) => `<span class="placeholder">${id}</span>`,
	'NUMB': () => `<span class="placeholder">#</span>`,
	'ICON': ({ locale, parameters: [id] }) => {
		switch (id) {
			case '34':
				return `<sub>0</sub>`;
			case '35':
				return `<sub>1</sub>`;
			case '39':
				return `<sub>5</sub>`;
			case '45':
				return `<sub>/</sub>`;
			case '159':
				return `<sup>${aligned.system.system['Miss'][locale]}</sup>`;
			case '160':
				return `<sup>${aligned.system.system['Death'][locale]}</sup>`;
			case '161':
				return `<sup>${aligned.system.system['Guard'][locale]}</sup>`;
			case '163':
				return `<sup>${aligned.system.system['MPCaption'][locale]}</sup>`;
			case '173':
				return `9`;
			case '174':
				return `/`;
			case '179':
				return `<sup class="color yellow">${aligned.system.system['Critical'][locale]}</sup>`;
		}

		return `<span class="icon ${iconMap[id].replaceAll('_', '-')}"></span>`;
	},
};

function transform(message: string, locale: string, openMarkupTags: string[] = []) {
	const transformedMessage = [...message.matchAll(/\[([A-Z0-9]+?)(?:=(.+?))?\]/g)].reduce(
		(result, [match, tag, parameters]) => {
			return result.replace(
				match,
				transformers[tag]?.({ locale, openMarkupTags, parameters: parameters?.split(',') ?? [] }) ?? '',
			);
		},
		htmlTools.encode(message),
	);

	const resultMessage = `${transformedMessage.trim()}${closeHTML(openMarkupTags)}`;

	if (!htmlTools.cache.includes(resultMessage)) {
		const report = htmlTools.validate(resultMessage);

		if (!report.valid) {
			htmlTools.persistCache();
			throw new Error(report.results[0].messages[0].message);
		}

		htmlTools.cache.push(resultMessage);
	}

	return resultMessage;
}

function mapEntries<T, U>(source: Record<string, T>, callback: (value: T, key: string) => U): Record<string, U> {
	return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, callback(value, key)]));
}

function extractLocale(locale: string, entry: Partial<Record<string, string>>) {
	const message = entry[locale];

	if (!message) {
		return {};
	}

	return {
		[locale]: transform(message, locale),
	};
}

const dataDir = `display/public/final-fantasy-9/data`;
const skeleton = new Skeleton(dataDir);

for (const locale of Object.values(localeMap)) {
	const messages = {
		'localization.txt': mapEntries(aligned.system.system, (entries, name) => {
			console.log(locale, `manifest/text/localization.txt/${name}`);
			return extractLocale(locale, entries);
		}),
		'field': mapEntries(aligned.field, (entries, file) => {
			return entries.map((entry, index) => {
				console.log(locale, `field/${file} #${index}`);
				return extractLocale(locale, entry);
			});
		}),
		'item': mapEntries(aligned.item, (entries, file) => {
			return entries.map((entry, index) => {
				console.log(locale, `item/${file} #${index}`);
				return extractLocale(locale, entry);
			});
		}),
		'keyitem': mapEntries(aligned.keyitem, (entries, file) => {
			return entries.map((entry, index) => {
				console.log(locale, `keyitem/${file} #${index}`);
				return extractLocale(locale, entry);
			});
		}),
		'ability': mapEntries(aligned.ability, (entries, file) => {
			return entries.map((entry, index) => {
				console.log(locale, `ability/${file} #${index}`);
				return extractLocale(locale, entry);
			});
		}),
		'command': mapEntries(aligned.command, (entries, file) => {
			return entries.map((entry, index) => {
				console.log(locale, `command/${file} #${index}`);
				return extractLocale(locale, entry);
			});
		}),
		'battle': mapEntries(aligned.battle, (entries, file) => {
			return entries.map((entry, index) => {
				console.log(locale, `battle/${file} #${index}`);
				return extractLocale(locale, entry);
			});
		}),
		'location': {
			'loc_name.mes': mapEntries(aligned.location['loc_name.mes'], (entries, index) => {
				console.log(locale, `location/log_name.mes #${index}`);
				return extractLocale(locale, entries);
			}),
		},
		'etc': mapEntries(aligned.etc, (entries, file) => {
			return entries.map((entry, index) => {
				console.log(locale, `etc/${file} #${index}`);
				return extractLocale(locale, entry);
			});
		}),
		'title': mapEntries(aligned.title, (entries, file) => {
			return entries.map((entry, index) => {
				console.log(locale, `title/${file} #${index}`);
				return extractLocale(locale, entry);
			});
		}),
	};

	skeleton.update(messages);
	writeFileSync(path.join(dataDir, `${locale}.json`), JSON.stringify(messages));
}

skeleton.persist();
htmlTools.persistCache();
