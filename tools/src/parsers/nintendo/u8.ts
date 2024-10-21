import { readFileSync } from 'node:fs';

import { BinaryReader, ByteOrder, DataType, Encoding } from '@nishin/reader';

interface Directory {
	readonly name: string;
	readonly shiftIndex: number;
}

export interface U8DataFile {
	readonly name: string;
	readonly path: readonly string[];
	readonly data: Buffer;
}

/**
 * Good documentation of the U8 archive structure is hard to find.
 * The most informative is this: http://wiki.tockdom.com/wiki/U8_%28File_Format%29
 * It's summarized here as the wiki might not be maintained.
 *
 * U8 files are uncompressed archives that contain a hierarchical file system.
 * A U8 file consists of three sections: header, nodes info, data.
 * Numeric values are stored as big-endian.
 *
 * The header is 32 bytes long:
 * 0x00   u32       Magic: always 0x55aa382d
 * 0x04   u32       Offset to the nodes info section
 * 0x08   u32       Size of the nodes info section
 * 0x0c   u32       Offset to the data section
 * 0x10   u8[16]    Unknown, probably just padding zeros
 *
 * The node info section consists of two parts:
 * A list of numeric node attributes, followed by a list of 0x00-terminated ascii strings.
 * The node list is zero-indexed, the first node in the list is the root directory.
 * Each numeric node-struct is 12 bytes long with this format:
 * 0x00   u8        Type: 0x00 = data file, 0x01 = directory
 * 0x01   u24       Offset to the entry's name in the string list (apparently the root's name is always the empty string)
 * 0x04   u32       Root: 0x00
 *                  Directory: index of the parent directory node (unclear how this is useful information)
 *                  File: offset to data from start of U8 archive file
 * 0x08   u32       Root: number of nodes, including the root directory
 *                  Directory: index of the first node that is not part of this directory
 *                  File: size of data block
 *
 * The offset to the string list is calculated by multiplying the length of one node info block with the total number of nodes.
 * Iterating the node list requires the concept of a current directory which initially is the root directory.
 * A node (except the root) is a direct child of the current directory. When a directory node is encountered, it is set as current directory,
 * until the index of the node that isn't part of this directory anymore is reached, then the current directory's parent is set to be the new
 * current directory.
 *
 * Nothing special about the data section, apparently it can be arbitrary.
 */
export class U8 {
	readonly files: readonly U8DataFile[];

	constructor(source: string | URL | Buffer) {
		const data = source instanceof Buffer ? source : readFileSync(source);

		const reader = new BinaryReader(data, ByteOrder.BigEndian);

		reader.assertMagic(Buffer.from([0x55, 0xaa, 0x38, 0x2d]));

		const startOffset = reader.next(DataType.Uint32);

		reader.seek(startOffset + 8);

		const nodeCount = reader.next(DataType.Uint32);

		const nodeSize = 12;
		const directoryStack: Directory[] = [];

		this.files = Array.from({ length: nodeCount - 1 }).reduce<U8DataFile[]>((files, _, i) => {
			const index = i + 1;

			reader.seek(startOffset + index * nodeSize);

			const isDirectory = reader.next(DataType.Boolean);

			reader.skip(1);

			const nameOffset = reader.next(DataType.Uint16);
			const info = reader.next(DataType.array(DataType.Uint32, 2));

			reader.seek(startOffset + nodeCount * nodeSize + nameOffset);

			const name = reader.next(DataType.string(Encoding.ASCII));

			const shiftIndex = directoryStack[0]?.shiftIndex ?? nodeCount;

			if (shiftIndex === index) {
				directoryStack.shift();
			}

			if (isDirectory) {
				directoryStack.unshift({ name, shiftIndex: info[1] });
			} else {
				const [dataOffset, size] = info;
				files.push({
					name,
					path: [...directoryStack].reverse().map((directory) => directory.name),
					data: reader.buffer.slice(dataOffset, dataOffset + size),
				});
			}

			return files;
		}, []);
	}
}
