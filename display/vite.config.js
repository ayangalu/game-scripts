import { readFileSync } from 'node:fs';

import { defineConfig } from 'vite';

let buildConfig = {};

try {
	buildConfig = JSON.parse(readFileSync(`display/vite.build-config.json`));
} catch {}

export default defineConfig({
	base: '/game-scripts/',
	esbuild: {
		tsconfigRaw: readFileSync('tsconfig.display.json', 'utf8'),
	},
	json: {
		stringify: true,
	},
	server: {
		fs: {
			allow: ['..', 'components', 'worker'],
		},
	},
	build: buildConfig,
});
