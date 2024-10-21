import { array, literal, object, record, union, type Infer, type Schema } from 'tashikame';

import { FileTree } from './file-tree.js';

export type LocaleVariant = {
	readonly '*': string;
	readonly [key: string]: string;
};

export const LocaleVariant: Schema<LocaleVariant> = object(
	{
		'*': 'string',
	},
	{
		name: 'LocaleVariant',
		additionalProperties: 'string',
	},
);

export const Platform = union([literal('PC'), literal('Switch'), literal('Wii')]);
export type Platform = Infer<typeof Platform>;

export const GameEntry = object(
	{
		id: {
			value: 'string',
			inferReadonly: true,
		},
		title: {
			value: LocaleVariant,
			inferReadonly: true,
		},
		platform: {
			value: Platform,
			inferReadonly: true,
		},
		version: {
			value: 'string',
			inferReadonly: true,
		},
		fileTree: {
			value: FileTree,
			inferReadonly: true,
		},
		locales: {
			value: array('string', { inferReadonly: true }),
			inferReadonly: true,
		},
		ruby: {
			value: array('string', { inferReadonly: true }),
			optional: true,
			inferReadonly: true,
		},
		characters: {
			value: record(LocaleVariant, { inferReadonly: true }),
			optional: true,
			inferReadonly: true,
		},
	},
	{
		name: 'GameEntry',
	},
);

export type GameEntry = Infer<typeof GameEntry>;
