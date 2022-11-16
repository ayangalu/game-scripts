import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { HtmlValidate } from 'html-validate';

const htmlValidate = new HtmlValidate({
	extends: ['html-validate:recommended'],
	rules: {
		'no-trailing-whitespace': 'off',
	},
});

export class HtmlTools {
	private cacheFile;

	readonly cache: string[];

	constructor(name: string) {
		const cacheDir = `.cache/${name}`;
		this.cacheFile = path.join(cacheDir, 'valid-html.json');
		this.cache = (() => {
			try {
				return JSON.parse(readFileSync(this.cacheFile, 'utf-8'));
			} catch {
				mkdirSync(cacheDir, { recursive: true });
				return [];
			}
		})();
	}

	validate(template: string) {
		return htmlValidate.validateString(template);
	}

	persistCache() {
		writeFileSync(this.cacheFile, JSON.stringify(this.cache));
	}
}
