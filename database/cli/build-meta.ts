import { readFile, writeFile } from 'node:fs/promises';

import { glob } from 'glob';
import { parse } from 'tashikame';

import { GameEntry } from '@game-scripts/schema/game-entry';

const entries: unknown[] = [];

for (const file of await glob('../entries/**/meta/*.json')) {
	console.log(file);
	const entry = JSON.parse(await readFile(file, 'utf-8'));
	parse(GameEntry, entry);
	entries.push(entry);
}

await writeFile('../display/app/entries.json', JSON.stringify(entries));
