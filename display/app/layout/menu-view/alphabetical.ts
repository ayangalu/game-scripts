import { localeCompare } from './locale-compare.js';

export const alphabeticalViewProvider: MenuViewProvider = (entries) => {
	const groups = entries.reduce((result, entry) => {
		const initial = String.fromCodePoint(entry.title['*'].codePointAt(0)!);
		const key = /\p{Letter}/u.test(initial) ? initial.toLocaleUpperCase('en-US') : '#';
		const items = result.get(key) ?? new Set();

		items.add(entry.id);
		result.set(key, items);

		return result;
	}, new Map<string, Set<string>>());

	return [...groups]
		.map(([label, items]) => {
			return {
				label,
				items: [...items].sort(localeCompare()),
			};
		})
		.sort(localeCompare(({ label }) => label));
};
