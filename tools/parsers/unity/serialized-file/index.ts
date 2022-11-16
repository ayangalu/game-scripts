import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { BinaryReader, ByteOrder, DataType, Encoding, repeat } from '@nishin/reader';

import { ensure } from '../../../ensure';
import { Asset, AssetType, ResourceManager } from './assets';
import { Platform } from '../platform';
import { SerializedType } from './serialized-type';
import { Version } from './version';
import { TextAsset } from './assets/text-asset';

export interface AssetEntry {
	readonly pathId: bigint;
	readonly buffer: Buffer;
	readonly typeId: number;
	readonly serializedType: SerializedType;
	readonly classId: number;
	readonly isDestroyed: number;
	readonly stripped: number;
	readonly asset?: Asset;
}

export interface ScriptType {
	readonly fileIndex: number;
	readonly id: bigint;
}

export interface ExternalFile {
	readonly path: string;
	readonly file?: SerializedFile;
	readonly guid?: number[];
	readonly type?: number;
}

export class SerializedFile {
	private static readonly cache = new Map<string, SerializedFile>();

	readonly unityVersion: string;
	readonly platform: Platform;
	readonly bigIdEnabled: number;
	readonly types: readonly SerializedType[];
	readonly entries: readonly AssetEntry[];
	readonly scriptTypes: readonly ScriptType[];
	readonly externals: readonly ExternalFile[];
	readonly refTypes?: readonly SerializedType[];
	readonly userInformation?: string;
	readonly resources?: Map<string, Buffer>;

	constructor(source: string) {
		const reader = new BinaryReader(readFileSync(source), ByteOrder.BigEndian);

		SerializedFile.cache.set(path.normalize(source), this);

		const header = {
			metaSize: reader.next(DataType.Uint32).value,
			fileSize: reader.next(DataType.bigint({ signed: false, byteLength: 4 })).value,
			version: reader.next(DataType.Uint32).value,
			dataOffset: reader.next(DataType.bigint({ signed: false, byteLength: 4 })).value,
		};

		const byteOrder = (() => {
			let isBigEndian;

			if (header.version >= Version.Unknown9) {
				isBigEndian = reader.next(DataType.Boolean).value;
				reader.skip(3);
			} else {
				reader.seek(Number(header.fileSize) - header.metaSize);
				isBigEndian = reader.next(DataType.Boolean).value;
			}

			return isBigEndian ? ByteOrder.BigEndian : ByteOrder.LittleEndian;
		})();

		if (header.version >= Version.LargeFileSupport) {
			header.metaSize = reader.next(DataType.Uint32).value;
			header.fileSize = reader.next(DataType.BigInt64).value;
			header.dataOffset = reader.next(DataType.BigInt64).value;
			reader.skip(8); // unknown
		}

		reader.setByteOrder(byteOrder);

		this.unityVersion =
			header.version >= Version.Unknown7 ? reader.next(DataType.string(Encoding.ASCII)).value : '2.5.0f5';
		this.platform = header.version >= Version.Unknown8 ? reader.next(DataType.Int32).value : 0;

		const enableTypeTree = header.version >= Version.HasTypeTreeHashes && reader.next(DataType.Boolean).value;

		this.types = repeat(
			reader.next(DataType.Int32).value,
			() => new SerializedType(reader, header.version, enableTypeTree, false),
		);

		if (header.version >= Version.Unknown7 && header.version < Version.Unknown14) {
			this.bigIdEnabled = reader.next(DataType.Int32).value;
		} else {
			this.bigIdEnabled = 0;
		}

		this.entries = repeat(reader.next(DataType.Int32).value, () => {
			const pathId = (() => {
				if (this.bigIdEnabled !== 0) {
					return reader.next(DataType.BigInt64).value;
				}

				if (header.version < Version.Unknown14) {
					return reader.next(DataType.bigint({ signed: true, byteLength: 4 })).value;
				}

				reader.align(4);
				return reader.next(DataType.BigInt64).value;
			})();

			const byteStart = Number(
				(header.version >= Version.LargeFileSupport
					? reader.next(DataType.BigInt64).value
					: reader.next(DataType.bigint({ signed: false, byteLength: 4 })).value) + header.dataOffset,
			);

			const size = reader.next(DataType.Uint32).value;

			const buffer = reader.buffer.subarray(byteStart, byteStart + size);

			const typeId = reader.next(DataType.Int32).value;

			const [serializedType, classId] = (() => {
				if (header.version < Version.RefactoredClassId) {
					return [ensure(this.types.find((t) => t.classId === typeId)), reader.next(DataType.Uint16).value] as const;
				}

				const type = this.types[typeId];
				return [type, type.classId] as const;
			})();

			const isDestroyed = header.version < Version.HasScriptTypeIndex ? reader.next(DataType.Uint16).value : 0;

			if (header.version >= Version.HasScriptTypeIndex && header.version < Version.RefactorTypeData) {
				const index = reader.next(DataType.Int16).value;
				if (serializedType) {
					// @ts-expect-error
					serializedType.scriptTypeIndex = index;
				}
			}

			const stripped = [Version.SupportsStrippedObject, Version.RefactoredClassId].includes(header.version)
				? reader.next(DataType.Uint8).value
				: 0;

			return {
				pathId,
				buffer,
				typeId,
				serializedType,
				classId,
				isDestroyed,
				stripped,
				asset: (() => {
					const Asset = AssetType.get(classId);
					if (Asset) {
						return new Asset(new BinaryReader(buffer, byteOrder), header.version, this.platform);
					}
				})(),
			};
		});

		this.scriptTypes = (() => {
			if (header.version < Version.HasScriptTypeIndex) {
				return [];
			}

			return repeat(reader.next(DataType.Int32).value, () => {
				return {
					fileIndex: reader.next(DataType.Int32).value,
					id: (() => {
						if (header.version < Version.Unknown14) {
							return reader.next(DataType.bigint({ signed: true, byteLength: 4 })).value;
						}

						reader.align(4);
						return reader.next(DataType.BigInt64).value;
					})(),
				};
			});
		})();

		this.externals = repeat(reader.next(DataType.Int32).value, () => {
			if (header.version >= Version.Unknown6) {
				reader.next(DataType.string(Encoding.UTF8));
			}

			const [guid, type] = ((): [number[]?, number?] => {
				if (header.version >= Version.Unknown5) {
					return [reader.next(DataType.array(DataType.Uint8, 16)).value, reader.next(DataType.Int32).value];
				}

				return [];
			})();

			const sourcePath = reader.next(DataType.string(Encoding.UTF8)).value;
			const externalPath = path.join(path.dirname(source), sourcePath);

			return {
				path: sourcePath,
				file: (() => {
					try {
						return SerializedFile.cache.get(externalPath) ?? new SerializedFile(externalPath);
					} catch {}
				})(),
				guid,
				type,
			};
		});

		this.refTypes = (() => {
			if (header.version >= Version.SupportsRefObject) {
				return repeat(reader.next(DataType.Int32).value, () => {
					return new SerializedType(reader, header.version, enableTypeTree, true);
				});
			}
		})();

		if (header.version >= Version.Unknown5) {
			this.userInformation = reader.next(DataType.string(Encoding.UTF8)).value;
		}

		const resourceManager = this.entries
			.map(({ asset }) => asset)
			.find((asset): asset is ResourceManager => asset instanceof ResourceManager);

		if (resourceManager) {
			this.resources = new Map(
				[...resourceManager.resources.entries()].reduce<[string, Buffer][]>((result, [resourcePath, pointer]) => {
					if (pointer.fileId >= 1 && pointer.fileId <= this.externals.length) {
						const entry = this.externals[pointer.fileId - 1].file?.entries.find(({ pathId }) => pathId === pointer.pathId);

						if (entry?.asset instanceof TextAsset) {
							result.push([resourcePath, entry.asset.data]);
						}
					}

					return result;
				}, []),
			);
		}
	}

	extractResources(root: string, filter: (resourcePath: string) => boolean = () => true) {
		this.resources?.forEach((data, resourcePath) => {
			if (!filter(resourcePath)) {
				return;
			}

			const { base, dir } = path.parse(resourcePath);
			const targetPath = path.join(root, dir);

			mkdirSync(targetPath, { recursive: true });
			writeFileSync(path.join(targetPath, base), data);
		});
	}
}
