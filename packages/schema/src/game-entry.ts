import { array, literal, object, record, union, type Infer, type Schema } from "@tao/tashikame";

export type LocaleVariant = {
	readonly "*": string;
	readonly [key: string]: string;
};

export const LocaleVariant: Schema<LocaleVariant> = object(
	{
		"*": "string",
	},
	{
		name: "LocaleVariant",
		additionalProperties: "string",
	},
);

export const Platform = union([ literal("PC"), literal("Switch"), literal("Wii"), ]);
export type Platform = Infer<typeof Platform>;

export const GameEntry = object(
	{
		id: "string",
		title: LocaleVariant,
		platform: Platform,
		version: {
			value: "string",
			optional: true,
		},
		extractionTime: {
			value: "string",
			default: () => Temporal.Now.plainDateTimeISO("UTC").toString(),
		},
		locales: array("string"),
		ruby: {
			value: array("string"),
			optional: true,
		},
		characters: {
			value: record(LocaleVariant),
			optional: true,
		},
	},
	{
		name: "GameEntry",
		inferReadonly: "deep",
	},
);

export type GameEntry = Infer<typeof GameEntry>;
