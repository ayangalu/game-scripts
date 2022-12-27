import type { CheerioAPI } from 'cheerio';
import { load } from 'cheerio';

let index: Array<[string, SearchIndexLocation[]]>;
let messageFormat: MessageFormat;
let messageData: MessageData;

self.onmessage = (event) => {
	if (typeof event.data === 'object') {
		// @ts-expect-error
		messageFormat = event.data.format;
		// @ts-expect-error
		messageData = event.data.data;
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
	const locationMap: Record<string, SearchIndexLocation[]> = {};

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

	const walk = (format: MessageFormat, data: MessageData, path: string[]) => {
		const visited = new Set<string>();

		const processMessages = (name: string, subTree: MessageData[string]) => {
			for (const [key, message] of Object.entries(subTree as MessageDict | MessageList)) {
				for (const [locale, value] of Object.entries(message)) {
					const location = {
						path: [...path, name],
						key,
						locale,
						message: value,
					};

					const rb = rubyBase(load(value));
					const rt = rubyText(load(value));

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
				}
			}
		};

		for (const [entry, definition] of Object.entries(format)) {
			const processSubTrees: SubTreeProcessor<void> = ({ forWildcard, forEntry }) => {
				if (entry === '*') {
					for (const [name, subTree] of Object.entries(data)) {
						if (visited.has(name)) {
							continue;
						}

						forWildcard(name, subTree);
					}
				} else {
					visited.add(entry);
					forEntry();
				}
			};

			if (definition) {
				processSubTrees({
					forWildcard: (name, subTree) => walk(definition, subTree as MessageData, [...path, name]),
					forEntry: () => walk(definition, data[entry] as MessageData, [...path, entry]),
				});
			} else {
				processSubTrees({
					forWildcard: processMessages,
					forEntry: () => processMessages(entry, data[entry]),
				});
			}
		}
	};

	walk(messageFormat, messageData, []);

	index = Object.entries(locationMap);

	self.postMessage('indexed');
}
