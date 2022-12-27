import type { BinaryReader } from '@nishin/reader';

import { ResourceManager } from './resource-manager';
import { TextAsset } from './text-asset';

export * from './resource-manager';

export type Asset = ResourceManager | TextAsset;

export const AssetType = new Map<
	number,
	new (reader: BinaryReader<Buffer>, version: number, platform: number) => Asset
>([
	[49, TextAsset],
	[147, ResourceManager],
]);
