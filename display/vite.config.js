import { readFileSync } from 'node:fs';

import { defineConfig } from 'vite';

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
			allow: ['components', 'worker'],
		},
	},
});
