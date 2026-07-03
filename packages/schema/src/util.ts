import type { Constructor } from "type-fest";
import { formatSchema, formatValue, registerSchemaName, validate, type Infer, type Schema, type SchemaFunction } from "@tao/tashikame/core";

export function instance<T>(value: Constructor<T>): SchemaFunction<T> {
	const name = `InstanceOf<${formatValue(value)}>`;

	return registerSchemaName(name, (input) => {
		if (input instanceof value) {
			return {
				valid: true,
				data: input,
			};
		}

		return {
			valid: false,
			expected: name,
			received: formatValue(input),
		};
	});
}

export function map<K extends Schema, V extends Schema>(key: K, value: V): SchemaFunction<Map<Infer<K>, Infer<V>>> {
	const name = `Map<${formatSchema(key)}, ${formatSchema(value)}>`;

	return registerSchemaName(name, (input) => {
		if (input instanceof Map) {
			for (const [ k, v, ] of input.entries()) {
				const keyReport = validate.safe(key, k);
				const valueReport = validate.safe(value, v);

				if (!keyReport || !valueReport) {
					return {
						valid: false,
						description: `Invalid entry`,
						expected: name,
						received: {
							key: k,
							value: v,
						},
					};
				}
			}

			return {
				valid: true,
				data: input,
			};
		}

		return {
			valid: false,
			expected: name,
			received: formatValue(input),
		};
	});
}
