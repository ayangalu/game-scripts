import { array, lazy, object, union, type Schema } from 'tashikame';

export type Folder = {
	readonly name: string;
	readonly items: FileTree;
};

export const Folder: Schema<Folder> = lazy(() =>
	object({
		name: 'string',
		items: FileTree,
	}),
);

type FileTreeNode = string | Folder;

export type FileTree = readonly FileTreeNode[];

export const FileTree: Schema<FileTree> = lazy(() => array(union(['string', Folder])));
