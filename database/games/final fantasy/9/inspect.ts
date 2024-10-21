import type { NDict } from '@game-scripts/tools/n-dict.js';
import { ensure } from '@game-scripts/tools/assert.js';

import { aligned } from './load-messages.js';

const find = (text: string) => {
	Object.entries(aligned).forEach(([category, files]) =>
		Object.entries(files).forEach(([file, rows]) =>
			Object.entries(rows as NDict<2, string>).forEach(([index, messages]) => {
				Object.entries(messages).forEach(([locale, message]) => {
					if (message.includes(text)) {
						console.log(category, file, index, locale);
					}
				});
			}),
		),
	);
};

const [tags, qualifiers] = Object.entries(aligned).reduce<[Record<string, any>, Record<string, any>]>(
	(result, [category, files]) => {
		Object.entries(files).forEach(([file, rows]) =>
			Object.entries(rows as NDict<2, string>).forEach(([index, messages]) => {
				Object.entries(messages).forEach(([locale, message]) => {
					const destination = `${category}/${file}/${index}/${locale}`;
					const codes = new Set([...message.matchAll(/\[(.+?)\]/g)].map(([_, code]) => ensure(code)));

					codes.forEach((code) => {
						const tagMatch = code.match(/([A-Z]{3}[A-Z0-9])(?:=(.+))?/);

						if (tagMatch) {
							const [_, tagName, option] = tagMatch;
							const tag = result[0][ensure(tagName)] ?? Object.create(null);
							const destinations = tag[option ?? ''] ?? Object.create(null);
							destinations[destination] = message;
							tag[option ?? ''] = destinations;
							result[0][ensure(tagName)] = tag;
						} else {
							const qualifier = result[1][code] ?? Object.create(null);
							qualifier[destination] = message;
							result[1][code] = qualifier;
						}
					});
				});
			}),
		);

		return result;
	},
	[Object.create(null), Object.create(null)],
);

debugger;
