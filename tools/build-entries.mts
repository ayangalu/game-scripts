import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

import url from './url.mjs';

const entries: GameEntry[] = [];

const root = new URL('./games', import.meta.url);

for (const game of readdirSync(root, { withFileTypes: true })) {
	if (game.isDirectory()) {
		for (const entry of readdirSync(url.join(root, game.name, 'meta'))) {
			entries.push(JSON.parse(readFileSync(url.join(root, game.name, 'meta', entry), 'utf-8')));
		}
	}
}

writeFileSync(
	`display/public/entries.json`,
	JSON.stringify(entries.sort((a, b) => a.title['*'].localeCompare(b.title['*'], 'en-US'))),
);
