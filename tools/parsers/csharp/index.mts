import { readFileSync } from 'node:fs';

import Parser from 'tree-sitter';
import CSharp from 'tree-sitter-c-sharp';

const parser = new Parser();

parser.setLanguage(CSharp);

function fieldDeclaration(name: string, valueExpression: string) {
	return `
		(field_declaration
			(variable_declaration
				(variable_declarator
					(identifier) @name (#eq? @name "${name}")
					(equals_value_clause ${valueExpression})
				)
			)
		)
	`;
}

export class CSharpFile {
	private readonly tree: Parser.Tree;

	constructor(file: string | URL) {
		this.tree = parser.parse(readFileSync(file, 'utf-8'));
	}

	parseArrayField<T>(name: string) {
		return new Parser.Query(
			CSharp,
			fieldDeclaration(
				name,
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
			.filter(({ name }) => name === 'value')
			.map<T>(({ node }) => JSON.parse(node.text));
	}

	parseObjectField<T>(name: string) {
		return new Parser.Query(
			CSharp,
			fieldDeclaration(
				name,
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
			.filter(({ name }) => ['key', 'value'].includes(name))
			.reduce<Record<string, T>>((result, _, index, source) => {
				if (index % 2 === 0) {
					const key = JSON.parse(source[index].node.text);
					result[key] = JSON.parse(source[index + 1].node.text);
				}

				return result;
			}, {});
	}
}
