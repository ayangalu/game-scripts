import { readFileSync } from "node:fs";

import { union, validate } from "@tao/tashikame";
import { getWasmPath } from "tree-sitter-wasm";
import { Language, Parser, Query, type Tree } from "web-tree-sitter";

import { ensure } from "#/util/ensure.ts";


await Parser.init();

const CSharp = await Language.load(getWasmPath("c_sharp"));

const parser = new Parser();

parser.setLanguage(CSharp);

function fieldDeclaration(name: string, valueExpression: string) {
	return `
		(field_declaration
			(variable_declaration
				(variable_declarator
					(identifier) @name (#eq? @name "${name}")
					${valueExpression}
				)
			)
		)
	`;
}

export class CSharpFile {
	private readonly tree: Tree;

	constructor(file: string | URL) {
		this.tree = ensure(parser.parse(readFileSync(file, "utf-8")));
	}

	parseArrayField<T>(fieldName: string) {
		return new Query(
			CSharp,
			fieldDeclaration(
				fieldName,
				`
					(array_creation_expression
						(initializer_expression
							(_) @value
						)
					)
				`,
			),
		)
			.captures(this.tree.rootNode)
			.filter(({ name, }) => name === "value")
			.map<T>(({ node, }) => JSON.parse(node.text));
	}

	parseObjectField<T>(fieldName: string) {
		return new Query(
			CSharp,
			fieldDeclaration(
				fieldName,
				`
					(object_creation_expression
						initializer: (initializer_expression
							(initializer_expression
								(_) @key
								(_) @value
							)
						)
					)
				`,
			),
		)
			.captures(this.tree.rootNode)
			.filter(({ name, }) => [ "key", "value", ].includes(name))
			.reduce<Record<string, T>>((result, _, index, source) => {
				if (index % 2 === 0) {
					const key = validate(union([ "string", "number", ]), JSON.parse(ensure(source[index]?.node.text)));
					result[key] = JSON.parse(ensure(source[index + 1]?.node.text));
				}

				return result;
			}, {});
	}
}
