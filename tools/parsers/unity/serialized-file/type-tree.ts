import { BinaryReader, DataType, Encoding, repeat } from '@nishin/reader';

import { Version } from './version';

export interface TypeTreeNode {
	readonly type: string;
	readonly name: string;
	readonly size: number;
	readonly index: number | undefined;
	readonly typeFlags: number;
	readonly version: number;
	readonly metaFlag: number | undefined;
	readonly level: number;
	readonly referenceTypeHash?: bigint;
}

export class TypeTree {
	readonly nodes: readonly TypeTreeNode[];

	constructor(reader: BinaryReader<Buffer>, version: number) {
		if (version === Version.Unknown10 || version >= Version.Unknown12) {
			this.nodes = this.readBlob(reader, version);
		} else {
			this.nodes = this.readRecursive(reader, version);
		}
	}

	private readRecursive(
		reader: BinaryReader<Buffer>,
		version: number,
		nodes: TypeTreeNode[] = [],
		level = 0,
	): TypeTreeNode[] {
		const type = reader.next(DataType.string(Encoding.UTF8)).value;
		const name = reader.next(DataType.string(Encoding.UTF8)).value;
		const size = reader.next(DataType.Int32).value;

		if (version === Version.Unknown2) {
			reader.skip(4);
		}

		const index = version !== Version.Unknown3 ? reader.next(DataType.Int32).value : undefined;
		const typeFlags = reader.next(DataType.Int32).value;
		const nodeVersion = reader.next(DataType.Int32).value;
		const metaFlag = version !== Version.Unknown3 ? reader.next(DataType.Int32).value : undefined;

		nodes.push({
			type,
			name,
			size,
			index,
			typeFlags,
			version: nodeVersion,
			metaFlag,
			level,
		});

		repeat(reader.next(DataType.Int32).value, () => this.readRecursive(reader, version, nodes, level + 1));

		return nodes;
	}

	private readBlob(reader: BinaryReader<Buffer>, version: number): TypeTreeNode[] {
		const offsets = new Map<TypeTreeNode, { type: number; name: number }>();
		const nodeCount = reader.next(DataType.Int32).value;
		const stringBufferSize = reader.next(DataType.Int32).value;

		const nodes = repeat(nodeCount, () => {
			const nodeVersion = reader.next(DataType.Uint16).value;
			const level = reader.next(DataType.Uint8).value;
			const typeFlags = reader.next(DataType.Uint8).value;

			const offset = {
				type: reader.next(DataType.Uint32).value,
				name: reader.next(DataType.Uint32).value,
			};

			const size = reader.next(DataType.Int32).value;
			const index = reader.next(DataType.Int32).value;
			const metaFlag = reader.next(DataType.Int32).value;

			const node: TypeTreeNode = {
				type: '',
				name: '',
				version: nodeVersion,
				level,
				typeFlags,
				size,
				index,
				metaFlag,
			};

			if (version >= Version.TypeTreeNodeWithTypeFlags) {
				// @ts-expect-error
				node.referenceTypeHash = reader.next(DataType.BigUint64).value;
			}

			offsets.set(node, offset);

			return node;
		});

		const stringBuffer = reader.slice(stringBufferSize);

		nodes.forEach((node) => {
			const offset = offsets.get(node);

			if (!offset) {
				throw new Error(`missing offsets for tree type node`);
			}

			// @ts-expect-error
			node.type = this.readBlobString(stringBuffer, offset.type);
			// @ts-expect-error
			node.name = this.readBlobString(stringBuffer, offset.name);
		});

		return nodes;
	}

	private readBlobString(reader: BinaryReader<Buffer>, value: number) {
		if (!(value & 0x80000000)) {
			reader.seek(value);
			return reader.next(DataType.string(Encoding.UTF8)).value;
		}

		throw new Error(`TODO?: lookup common strings`);

		// const offset = value & 0x7fffffff;
		// return offset.toString(16);
	}
}
