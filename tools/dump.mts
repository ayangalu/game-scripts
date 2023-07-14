import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import './env.mjs';
import { HtmlTools } from './html-tools.mjs';
import url from './url.mjs';

const gameRoot = `./games/${process.argv[2]}`;
const rootUrl = new URL(gameRoot, import.meta.url);
const html = new HtmlTools(rootUrl);
const dump = await import(`${gameRoot}/dump.mjs`);

try {
	for (const entryPath of readdirSync(url.join(rootUrl, 'meta'))) {
		const platform = path.parse(entryPath).name;
		const entry = JSON.parse(readFileSync(url.join(rootUrl, 'meta', entryPath), 'utf-8'));
		dump.default(platform, entry, html);
	}
} finally {
	html.persistCache();
}
