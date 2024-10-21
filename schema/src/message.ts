import { lazy, record, union, type Infer, type Schema } from 'tashikame';

export const LocalizedMessage = record('string', { inferReadonly: true });
export type LocalizedMessage = Infer<typeof LocalizedMessage>;

export type DataTree = {
	readonly [key: string]: DataTree | LocalizedMessage;
};

export const DataTree: Schema<DataTree> = lazy(() => record(union([DataTree, LocalizedMessage])));
