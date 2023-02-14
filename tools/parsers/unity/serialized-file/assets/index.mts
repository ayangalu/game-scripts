import type { BinaryReader } from '@nishin/reader';

import { ResourceManager } from './resource-manager.mjs';
import { TextAsset } from './text-asset.mjs';

export * from './resource-manager.mjs';

export type Asset = ResourceManager | TextAsset;

export const AssetType = new Map<
	number,
	new (reader: BinaryReader<Buffer>, version: number, platform: number) => Asset
>([
	[49, TextAsset],
	[147, ResourceManager],
]);
