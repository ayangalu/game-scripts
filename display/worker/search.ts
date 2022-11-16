import type { CheerioAPI } from 'cheerio';
import { load } from 'cheerio';

import type { NRecord, SearchIndexLocation } from '../types';

let index: Array<[string, SearchIndexLocation[]]>;
let data: NRecord<string, string, 4>;

self.onmessage = (event) => {
	if (typeof event.data === 'object') {
		// @ts-expect-error
		data = event.data;
		buildIndex();
	}

	if (typeof event.data === 'string') {
		search(normalize(event.data));
	}
};

function normalize(value: string) {
	return value.replace(/\p{White_Space}/gu, ' ').trim();
}

function search(value: string) {
	const locations = index.filter(([key]) => key.includes(value)).flatMap(([_, location]) => location);
	// @ts-expect-error: need to improve Serializable type
	self.postMessage(locations);
}

function buildIndex() {
	const rubyBase = ($: CheerioAPI) => {
		$('hr').replaceWith(' ');
		$('rt').remove();
		return normalize($.text());
	};

	const rubyText = ($: CheerioAPI) => {
		$('hr').replaceWith(' ');
		$('ruby').replaceWith((_, ruby) => $('rt', ruby));
		return normalize($.text());
	};

	const locationMap: Record<string, SearchIndexLocation[]> = {};

	Object.entries(data).forEach(([group, files]) => {
		Object.entries(files).forEach(([file, locales]) => {
			Object.entries(locales).forEach(([label, messages]) => {
				Object.entries(messages).forEach(([locale, message]) => {
					const location = { group, file, label, locale, message };

					const rb = rubyBase(load(message));
					const rt = rubyText(load(message));

					if (rb) {
						const locations = locationMap[rb];
						if (locations) {
							locations.push(location);
						} else {
							locationMap[rb] = [location];
						}
					}

					if (rb !== rt) {
						const locations = locationMap[rt];
						if (locations) {
							locations.push(location);
						} else {
							locationMap[rt] = [location];
						}
					}
				});
			});
		});
	});

	index = Object.entries(locationMap);

	self.postMessage('indexed');
}
