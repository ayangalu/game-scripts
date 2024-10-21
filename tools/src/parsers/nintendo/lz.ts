import { ensure } from '../../assert.js';

export function decompress(source: Buffer) {
	const version = source.readUInt8();
	let targetSize: number;
	let sourceOffset: number;

	if (version === 0x10) {
		targetSize = source.readUIntLE(1, 3);
		sourceOffset = 4;
	} else if (version === 0x11) {
		targetSize = source.readUInt32LE(4);
		sourceOffset = 8;
	} else {
		throw new Error(`unknown LZ version`);
	}

	const bits = [7, 6, 5, 4, 3, 2, 1, 0] as const;

	const target = Buffer.alloc(targetSize);
	let targetOffset = 0;

	while (targetOffset < targetSize) {
		const byte = source.readUInt8(sourceOffset++);

		for (const bit of bits) {
			if (targetOffset >= targetSize) {
				break;
			}

			if (((byte >> bit) & 1) === 0) {
				target[targetOffset++] = source.readUInt8(sourceOffset++);
			} else {
				const lenmsb = source.readUInt8(sourceOffset++);
				const lsb = source.readUInt8(sourceOffset++);

				let size = lenmsb >> 4;
				let disp = ((lenmsb & 0xf) << 8) + lsb;

				if (version === 0x10) {
					size += 3;
				} else if (size > 1) {
					size += 1;
				} else if (size === 0) {
					size = ((lenmsb & 0xf) << 4) + (lsb >> 4) + 0x11;
					disp = ((lsb & 0xf) << 8) + source.readUInt8(sourceOffset++);
				} else {
					const b = source.readUInt8(sourceOffset++);
					size = ((lenmsb & 0xf) << 12) + (lsb << 4) + (b >> 4) + 0x111;
					disp = ((b & 0xf) << 8) + source.readUInt8(sourceOffset++);
				}

				const start = targetOffset - disp - 1;

				for (let i = 0; i < size; i++) {
					target[targetOffset++] = ensure(target[start + i]);
				}
			}
		}
	}

	return target;
}
