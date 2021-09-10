import { readFileSync } from 'node:fs';

import nodePolyfills from 'rollup-plugin-polyfill-node';
import { defineConfig } from 'vite';

export default defineConfig({
	esbuild: {
		tsconfigRaw: readFileSync('tsconfig.display.json', 'utf8'),
	},
	json: {
		stringify: true,
	},
	plugins: [{ ...nodePolyfills(), pre: true }],
});
