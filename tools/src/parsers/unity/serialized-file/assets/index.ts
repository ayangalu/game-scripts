import type { BinaryReader } from '@nishin/reader';

import { ResourceManager } from './resource-manager.js';
import { TextAsset } from './text-asset.js';

export * from './resource-manager.js';

export type Asset = ResourceManager | TextAsset;

export const AssetType = new Map<
	number,
	new (reader: BinaryReader<Buffer>, version: number, platform: number) => Asset
>([
	[49, TextAsset],
	[147, ResourceManager],
]);
