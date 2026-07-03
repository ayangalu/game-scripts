// @ts-check
/// <reference types="node" />
/// <reference path="./eslint-typegen.d.ts" />

import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout } from "node:timers/promises";

import pluginStylistic from "@stylistic/eslint-plugin";
import pluginTao from "@tao/eslint-plugin";
import pluginUnusedImports from "eslint-plugin-unused-imports";
import typegen from "eslint-typegen";
import tseslint from "typescript-eslint";

export default typegen([
	{
		ignores: [ "eslint-typegen.d.ts", "dist/**/*", ],
	},
	{
		files: [ "**/*.?(c|m)@(j|t)s", ],
		plugins: {
			"stylistic": pluginStylistic,
			"tao": pluginTao,
			"unused-imports": pluginUnusedImports,
		},
		rules: {
			"tao/group-imports": [ "error",
				{ class: "node", },
				{ class: "external", },
				"@game-scripts/**",
				{ class: "internal", },
				{ class: "relative", },
			],
			"tao/sort-imports": [ "error", { inlineTypes: "end", typesInGroup: "top", caseGroups: true, }, ],
			"stylistic/quotes": [ "error", "double", { allowTemplateLiterals: "always", }, ],
			"stylistic/quote-props": [ "error", "consistent", ],
			"stylistic/semi": [ "error", "always", ],
			"stylistic/semi-style": [ "error", "last", ],
			"stylistic/semi-spacing": [ "error", { before: false, after: true, }, ],
			"stylistic/comma-dangle": [ "error", {
				arrays: "always",
				objects: "always",
				imports: "always-multiline",
				exports: "always-multiline",
				functions: "always-multiline",
			}, ],
			"stylistic/comma-spacing": [ "error", { before: false, after: true, }, ],
			"stylistic/array-bracket-spacing": [ "error", "always", ],
			"stylistic/object-curly-spacing": [ "error", "always", ],
			"unused-imports/no-unused-imports": [ "error", ],
		},
	},
	{
		files: [ "**/*.?(c|m)ts", ],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				tsconfigRootDir: import.meta.dirname,
				projectService: true,
			},
		},
		plugins: {
			ts: tseslint.plugin,
		},
		rules: {
			"stylistic/member-delimiter-style": [ "error", { singleline: { requireLast: true, }, }, ],
			"ts/adjacent-overload-signatures": [ "error", ],
			"ts/no-import-type-side-effects": [ "error", ],
			"ts/no-duplicate-type-constituents": [ "error", ],
			"ts/no-implied-eval": [ "error", ],
			"ts/no-non-null-asserted-nullish-coalescing": [ "error", ],
			"ts/no-non-null-asserted-optional-chain": [ "error", ],
			"ts/no-shadow": [ "error", ],
			"ts/no-unnecessary-template-expression": [ "error", ],
			"ts/no-unsafe-argument": [ "error", ],
			"ts/no-unsafe-call": [ "error", ],
			"ts/no-unsafe-member-access": [ "error", ],
			"ts/no-unsafe-declaration-merging": [ "error", ],
			"ts/no-unsafe-unary-minus": [ "error", ],
			"ts/no-floating-promises": [ "error", { allowForKnownSafeCalls: [ {
				from: "package",
				package: "node:test",
				name: [ "test", "suite", "todo", ],
			}, ], }, ],
			"ts/consistent-type-imports": [ "error", { fixStyle: "inline-type-imports", }, ],
		},
	},
]).then((config) => {
	// https://github.com/antfu/eslint-typegen/issues/19#issuecomment-3615415254
	new Promise(async () => {
		// typegen writes the file without await
		await setTimeout(1000);

		const eslintPath = import.meta.resolve("eslint");
		const modulePath = path.join(path.relative(".", new URL(eslintPath).pathname), "../../../@eslint/core/dist/cjs/types.d.cts");

		const eslintTypegenSource = await fs.readFile("eslint-typegen.d.ts", "utf-8");

		const eslintTypegenModified = eslintTypegenSource
			.replace("import type { Linter } from 'eslint'", `import type { RuleConfig } from './${modulePath}'`)
			.replace(/^declare module 'eslint' \{$.*?^\}$/msu, `declare module './${modulePath}' {\n  interface RulesConfig extends RuleOptions {}\n}`)
			.replaceAll("Linter.RuleEntry", "RuleConfig");

		await fs.writeFile("eslint-typegen.d.ts", eslintTypegenModified);
	});

	return config;
});
