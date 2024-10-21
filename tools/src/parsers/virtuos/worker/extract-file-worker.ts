import { existsSync } from 'node:fs';
import { mkdir, open } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { constants, inflateSync } from 'node:zlib';

import { ByteOrder, DataType, NodeFileReader } from '@nishin/node-file-reader';

import { taskProcessor } from './task-processor.js';

export interface ExtractFileTask {
	readonly destination: string;
	readonly source: {
		readonly path: string;
		readonly fileCount: number;
		readonly blockSizeListOffset: number;
	};
	readonly file: {
		readonly blockSizeIndex: number;
		readonly size: number;
		readonly dataOffset: number;
		readonly path: string;
	};
}

export interface ExtractFileProgress {
	readonly progress: number;
}

taskProcessor<ExtractFileTask, ExtractFileProgress>(async ({ source, destination, file }, observer) => {
	const resolvedPath = resolve(destination, file.path);

	if (existsSync(resolvedPath)) {
		observer.complete();
		return;
	}

	const reader = new NodeFileReader(await open(source.path), ByteOrder.LittleEndian);

	const blockCount = Math.ceil(file.size / 0x10000);
	const lastBlockInflatedSize = file.size % 0x10000;
	const buffers: Uint8Array[] = [];

	let bytesRead = 0;
	let bytesInflated = 0;

	for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {
		await reader.seek(source.blockSizeListOffset + 2 * (file.blockSizeIndex + blockIndex));
		const blockSize = await reader.next(DataType.Uint16);

		await reader.seek(file.dataOffset + bytesRead);
		const blockData = await reader.next(DataType.bytes(blockSize || 0x10000));

		bytesRead += blockData.byteLength;

		let buffer = new Uint8Array(blockData);

		if (blockSize && (blockIndex < blockCount - 1 || blockSize !== lastBlockInflatedSize)) {
			buffer = inflateSync(buffer, { finishFlush: constants.Z_SYNC_FLUSH });
		}

		bytesInflated += buffer.byteLength;

		const progress = bytesInflated / file.size;

		observer.next({ progress });

		buffers.push(buffer);
	}

	reader.close();

	if (bytesInflated !== file.size) {
		throw new Error(`byte mismatch for file '${file.path}': expected ${file.size}, got ${bytesInflated}`);
	}

	await mkdir(dirname(resolvedPath), { recursive: true });

	const targetHandle = await open(resolvedPath, 'w');

	await targetHandle.writev(buffers);
	await targetHandle.close();

	observer.complete();
});
