import fs from 'node:fs/promises';

import { ByteOrder, DataType, Encoding, NodeFileReader } from '@nishin/node-file-reader';
import logUpdate from 'log-update';

import type { ExtractFileProgress, ExtractFileTask } from './extract-file-worker.mjs';
import { WorkerPool } from '../../worker-pool.mjs';

const Uint48 = DataType.int({ signed: false, byteLength: 6 });

const numberFormat = new Intl.NumberFormat('en-US', { style: 'percent' });

export class VBF {
	private readonly source: string;

	constructor(source: string) {
		this.source = source;
	}

	async extractTo(destination: string, filter: (filePath: string) => boolean = () => true) {
		const reader = new NodeFileReader(await fs.open(this.source), ByteOrder.LittleEndian);

		await reader.assertMagic('SRYK');

		// skip header size, assume this is a valid VBF file
		await reader.skip(4);

		// it looks as if this is supposed to be an uint64 but since the header size needs to fit in 4 bytes
		// and metadata for each file is 32 bytes the file count cannot exceed 4 bytes anyway
		const fileCount = await reader.next(DataType.Uint32);

		const stringTableOffset = 0x10 + fileCount * 0x30;

		await reader.seek(stringTableOffset);

		const stringTableSize = await reader.next(DataType.Uint32);

		const blockSizeListOffset = stringTableOffset + stringTableSize;

		const pool = new WorkerPool<ExtractFileTask, ExtractFileProgress>(
			new URL('./extract-file-worker.mts', import.meta.url),
		);
		const filesProgress = new Map<string, number>();

		let extractedCount = 0;
		let skipCount = 0;

		const log = () => {
			const filesLog = [...filesProgress.entries()]
				.map(([file, progress]) => `${numberFormat.format(progress).padStart(4, ' ')} ${file}`)
				.join('\n');

			logUpdate(
				[
					`extracted: ${extractedCount}`,
					`skipped:   ${skipCount}`,
					`processed: ${extractedCount + skipCount} / ${fileCount}`,
					filesLog,
				].join('\n'),
			);
		};

		logUpdate.clear();

		for (let fileIndex = 0; fileIndex < fileCount; fileIndex++) {
			await reader.seek(0x10 + fileCount * 0x10 + fileIndex * 0x20);
			const blockSizeIndex = await reader.next(DataType.Uint32);
			await reader.skip(4);
			const size = await reader.next(Uint48);
			await reader.skip(2);
			const dataOffset = await reader.next(Uint48);
			await reader.skip(2);
			const nameOffset = await reader.next(Uint48);
			await reader.seek(stringTableOffset + 0x04 + nameOffset);
			const filePath = await reader.next(DataType.string(Encoding.ASCII));

			if (!filter(filePath)) {
				skipCount++;
				continue;
			}

			pool
				.addTask({
					destination,
					source: {
						path: this.source,
						fileCount,
						blockSizeListOffset,
					},
					file: {
						path: filePath,
						size,
						blockSizeIndex,
						dataOffset,
					},
				})
				.subscribe({
					next: ({ progress }) => {
						filesProgress.set(filePath, progress);
						log();
					},
					complete: () => {
						filesProgress.delete(filePath);
						extractedCount++;
						log();
					},
				});
		}

		await reader.close();
		await pool.close();
	}
}
