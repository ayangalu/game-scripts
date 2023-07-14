import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { HtmlValidate } from 'html-validate';

import url from './url.mjs';

const htmlValidate = new HtmlValidate({
	extends: ['html-validate:recommended'],
	rules: {
		'no-trailing-whitespace': 'off',
	},
});

export class HtmlTools {
	private readonly filePath;
	private readonly cache: string[];

	constructor(root: URL) {
		const cacheDir = url.join(root, '.cache');
		this.filePath = url.join(cacheDir, 'html.json');
		this.cache = (() => {
			try {
				return JSON.parse(readFileSync(this.filePath, 'utf-8'));
			} catch {
				mkdirSync(cacheDir, { recursive: true });
				return [];
			}
		})();
	}

	validate(markup: string) {
		if (!this.cache.includes(markup)) {
			const report = htmlValidate.validateString(markup);

			if (!report.valid) {
				throw new Error(report.results[0].messages[0].message);
			}

			this.cache.push(markup);
		}
	}

	persistCache() {
		writeFileSync(this.filePath, JSON.stringify(this.cache));
	}
}
