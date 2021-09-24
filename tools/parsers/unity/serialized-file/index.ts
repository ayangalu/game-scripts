import path from 'node:path';

import { ensure } from '../../../ensure';
import { BinaryReader, ByteOrder, DataArray, DataType, repeat } from '../../binary';
import { Asset, AssetType } from './assets';
import { Platform } from '../platform';
import { SerializedType } from './serialized-type';
import { Version } from './version';

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

	constructor(source: string) {
		const reader = new BinaryReader(source).setByteOrder(ByteOrder.BigEndian);

		SerializedFile.cache.set(path.normalize(source), this);

		const header = {
			metaSize: reader.next(DataType.UInt32),
			fileSize: reader.next(DataType.BigUInt32),
			version: reader.next(DataType.UInt32),
			dataOffset: reader.next(DataType.BigUInt32),
		};

		const byteOrder = (() => {
			let isBigEndian;

			if (header.version >= Version.Unknown9) {
				isBigEndian = reader.next(DataType.Bool);
				reader.skip(3);
			} else {
				reader.seek(Number(header.fileSize) - header.metaSize);
				isBigEndian = reader.next(DataType.Bool);
			}

			return isBigEndian ? ByteOrder.BigEndian : ByteOrder.LittleEndian;
		})();

		if (header.version >= Version.LargeFileSupport) {
			header.metaSize = reader.next(DataType.UInt32);
			header.fileSize = reader.next(DataType.BigInt64);
			header.dataOffset = reader.next(DataType.BigInt64);
			reader.skip(8); // unknown
		}

		reader.setByteOrder(byteOrder);

		this.unityVersion = header.version >= Version.Unknown7 ? reader.next(DataType.StringASCII) : '2.5.0f5';
		this.platform = header.version >= Version.Unknown8 ? reader.next(DataType.Int32) : 0;

		const enableTypeTree = header.version >= Version.HasTypeTreeHashes && reader.next(DataType.Bool);

		this.types = repeat(
			reader.next(DataType.Int32),
			() => new SerializedType(reader, header.version, enableTypeTree, false),
		);

		if (header.version >= Version.Unknown7 && header.version < Version.Unknown14) {
			this.bigIdEnabled = reader.next(DataType.Int32);
		} else {
			this.bigIdEnabled = 0;
		}

		this.entries = repeat(reader.next(DataType.Int32), () => {
			const pathId = (() => {
				if (this.bigIdEnabled !== 0) {
					return reader.next(DataType.BigInt64);
				}

				if (header.version < Version.Unknown14) {
					return reader.next(DataType.BigInt32);
				}

				reader.align(4);
				return reader.next(DataType.BigInt64);
			})();

			const byteStart = Number(
				(header.version >= Version.LargeFileSupport ? reader.next(DataType.BigInt64) : reader.next(DataType.BigUInt32)) +
					header.dataOffset,
			);

			const size = reader.next(DataType.UInt32);

			const buffer = reader.buffer.slice(byteStart, byteStart + size);

			const typeId = reader.next(DataType.Int32);

			const [serializedType, classId] = (() => {
				if (header.version < Version.RefactoredClassId) {
					return [ensure(this.types.find((t) => t.classId === typeId)), reader.next(DataType.UInt16)] as const;
				}

				const type = this.types[typeId];
				return [type, type.classId] as const;
			})();

			const isDestroyed = header.version < Version.HasScriptTypeIndex ? reader.next(DataType.UInt16) : 0;

			if (header.version >= Version.HasScriptTypeIndex && header.version < Version.RefactorTypeData) {
				const index = reader.next(DataType.Int16);
				if (serializedType) {
					// @ts-expect-error
					serializedType.scriptTypeIndex = index;
				}
			}

			const stripped = [Version.SupportsStrippedObject, Version.RefactoredClassId].includes(header.version)
				? reader.next(DataType.UInt8)
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
						return new Asset(new BinaryReader(buffer).setByteOrder(byteOrder), header.version, this.platform);
					}
				})(),
			};
		});

		this.scriptTypes = (() => {
			if (header.version < Version.HasScriptTypeIndex) {
				return [];
			}

			return repeat(reader.next(DataType.Int32), () => {
				return {
					fileIndex: reader.next(DataType.Int32),
					id: (() => {
						if (header.version < Version.Unknown14) {
							return reader.next(DataType.BigInt32);
						}

						reader.align(4);
						return reader.next(DataType.BigInt64);
					})(),
				};
			});
		})();

		this.externals = repeat(reader.next(DataType.Int32), () => {
			if (header.version >= Version.Unknown6) {
				reader.next(DataType.StringUTF8);
			}

			const [guid, type] = ((): [number[]?, number?] => {
				if (header.version >= Version.Unknown5) {
					return [reader.next(DataArray(DataType.UInt8, 16)), reader.next(DataType.Int32)];
				}

				return [];
			})();

			const sourcePath = reader.next(DataType.StringUTF8);
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
				return repeat(reader.next(DataType.Int32), () => {
					return new SerializedType(reader, header.version, enableTypeTree, true);
				});
			}
		})();

		if (header.version >= Version.Unknown5) {
			this.userInformation = reader.next(DataType.StringUTF8);
		}

		void 0;
	}
}
