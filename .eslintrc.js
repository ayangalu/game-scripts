const { readFileSync } = require('node:fs');

function readReferences(configPath) {
	const config = JSON.parse(readFileSync(configPath, 'utf-8'));

	if (config.references) {
		return config.references.flatMap(({ path }) => readReferences(path));
	}

	return [configPath];
}

module.exports = {
	env: {
		es2021: true,
	},
	plugins: ['@shigen'],
	rules: {
		'@shigen/group-imports': [
			'error',
			'@dotenv/config',
			{ class: 'node' },
			'modern-css-reset',
			'@shoelace-style/shoelace/dist/themes',
			'@shoelace-style/shoelace/dist/components',
			{ class: 'external' },
			'@game-scripts',
			'~',
			{ class: 'relative' },
		],
		'@shigen/sort-imports': ['error', { caseGroups: true, typesInGroup: 'top' }],
	},
	overrides: [
		{
			files: ['.*rc.js', '*.js'],
			env: {
				node: true,
			},
		},
		{
			files: ['*.mjs', 'vite.config.js'],
			parserOptions: {
				sourceType: 'module',
				ecmaVersion: 2022,
			},
		},
		{
			files: ['*.ts', '*.mts'],
			parser: '@typescript-eslint/parser',
			parserOptions: {
				sourceType: 'module',
				project: readReferences('tsconfig.json'),
			},
			plugins: ['@typescript-eslint'],
			rules: {
				'@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
			},
		},
		{
			files: '*.d.ts',
			rules: {
				'@typescript-eslint/consistent-type-imports': 'off',
			},
		},
	],
};
