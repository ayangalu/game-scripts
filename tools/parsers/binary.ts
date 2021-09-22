import { readFileSync } from 'node:fs';

export const enum ByteOrder {
	BigEndian = 0xfeff,
	LittleEndian = 0xfffe,
}

export const enum Encoding {
	ASCII = 'ascii',
	UTF8 = 'utf-8',
	UTF16 = 'utf-16',
	UTF32 = 'utf-32',
}

interface Int {
	readonly type: 'int';
	readonly signed: boolean;
	readonly bytes: number;
}

interface Float {
	readonly type: 'float';
	readonly bytes: 4 | 8;
}

interface Char {
	readonly type: 'char';
	readonly encoding: Encoding;
}

interface Bool {
	readonly type: 'bool';
}

type Numeric = Int | Float;

type Atomic = Numeric | Char | Bool;

interface DataString {
	readonly type: 'string';
	readonly encoding: Encoding;
}

interface DataArray<T extends Atomic = Atomic> {
	readonly type: 'array';
	readonly subType: T;
	readonly count: number;
}

export function DataArray<T extends Atomic>(type: T, count: number): DataArray<T> {
	return {
		type: 'array',
		subType: type,
		count,
	};
}

interface Struct {
	[key: string]: DataType;
}

export type DataType = Atomic | DataArray | DataString;

export const DataType = {
	Bool: {
		type: 'bool',
	},
	UInt8: {
		type: 'int',
		signed: false,
		bytes: 1,
	},
	UInt16: {
		type: 'int',
		signed: false,
		bytes: 2,
	},
	UInt24: {
		type: 'int',
		signed: false,
		bytes: 3,
	},
	UInt32: {
		type: 'int',
		signed: false,
		bytes: 4,
	},
	UInt64: {
		type: 'int',
		signed: false,
		bytes: 8,
	},
	Int8: {
		type: 'int',
		signed: true,
		bytes: 1,
	},
	Int16: {
		type: 'int',
		signed: true,
		bytes: 2,
	},
	Int24: {
		type: 'int',
		signed: true,
		bytes: 3,
	},
	Int32: {
		type: 'int',
		signed: true,
		bytes: 4,
	},
	Int64: {
		type: 'int',
		signed: true,
		bytes: 8,
	},
	CharASCII: {
		type: 'char',
		encoding: Encoding.ASCII,
	},
	CharUTF8: {
		type: 'char',
		encoding: Encoding.UTF8,
	},
	StringASCII: {
		type: 'string',
		encoding: Encoding.ASCII,
	},
	StringUTF8: {
		type: 'string',
		encoding: Encoding.UTF8,
	},
} as const;

type Destruct<T extends DataType[] | Struct> = {
	[P in keyof T]: T[P] extends Struct
		? Destruct<T[P]>
		: T[P] extends DataArray
		? T[P]['subType'] extends Char
			? string
			: T[P]['subType'] extends Bool
			? boolean[]
			: number[]
		: T[P] extends Bool
		? boolean
		: T[P] extends Numeric
		? number
		: T[P] extends Char | DataString
		? string
		: never;
};

export function repeat<T>(times: number, callback: () => T) {
	return Array.from({ length: times }).map(() => callback());
}

export class BinaryReader {
	#lastBytesRead = 0;
	#offset = 0;

	get lastBytesRead() {
		return this.#lastBytesRead;
	}

	get offset() {
		return this.#offset;
	}

	readonly buffer: Buffer;
	readonly byteOrder?: ByteOrder;

	constructor(source: string | Buffer) {
		this.buffer = typeof source === 'string' ? readFileSync(source) : source;
	}

	checkMagic(magic: string | Buffer, position = 0) {
		this.#offset = position + magic.length;

		const source = this.buffer.slice(position, this.#offset);

		if (typeof magic === 'string' ? source.toString('ascii') !== magic : Buffer.compare(source, magic) !== 0) {
			throw new Error(`invalid magic`);
		}

		return this;
	}

	checkBOM(position: number) {
		const byteOrder = this.buffer.readUInt16BE(position);

		if (byteOrder !== ByteOrder.BigEndian && byteOrder !== ByteOrder.LittleEndian) {
			throw new Error(`invalid byte order mark`);
		}

		this.#offset = position + 2;

		return this.setByteOrder(byteOrder);
	}

	setByteOrder(byteOrder: ByteOrder) {
		// @ts-expect-error
		this.byteOrder = byteOrder;
		return this;
	}

	slice(size: number) {
		const reader = new BinaryReader(this.buffer.slice(this.#offset, this.#offset + size));

		if (this.byteOrder) {
			reader.setByteOrder(this.byteOrder);
		}

		this.skip(size);

		return reader;
	}

	skip(bytes: number) {
		this.#offset += bytes;
	}

	align(to: number) {
		this.skip(((-this.#offset % to) + to) % to);
	}

	seek(position: number) {
		this.#offset = position;
	}

	next(dataType: Bool): boolean;
	next(dataType: Numeric): number;
	next(dataType: Char | DataString): string;
	next(dataType: DataArray<Numeric>): number[];
	next(dataType: DataArray<Char>): string;
	next<T extends DataType[]>(...struct: T): Destruct<T>;
	next(...types: DataType[]): any {
		if (types.length === 0) {
			throw new Error(`need at least one data type to read`);
		}

		if (types.length > 1) {
			return types.map((type) => this.next(type));
		}

		const [dataType] = types;

		if (dataType.type === 'bool') {
			return Boolean(this.next(DataType.UInt8));
		}

		if (dataType.type === 'int') {
			if (dataType.bytes > 1 && !this.byteOrder) {
				throw new Error(`need byte order for reading values longer than one byte`);
			}

			let method;

			if (this.byteOrder === ByteOrder.BigEndian) {
				method = dataType.signed ? this.buffer.readIntBE : this.buffer.readUIntBE;
			} else {
				method = dataType.signed ? this.buffer.readIntLE : this.buffer.readUIntLE;
			}

			const value = method.call(this.buffer, this.#offset, dataType.bytes);
			this.#lastBytesRead = dataType.bytes;
			this.#offset += dataType.bytes;
			return value;
		}

		if (dataType.type === 'float') {
			if (!this.byteOrder) {
				throw new Error(`need byte order for reading float values`);
			}

			let method;

			if (this.byteOrder === ByteOrder.BigEndian) {
				method = dataType.bytes === 4 ? this.buffer.readFloatBE : this.buffer.readDoubleBE;
			} else {
				method = dataType.bytes === 4 ? this.buffer.readFloatLE : this.buffer.readDoubleLE;
			}

			const value = method.call(this.buffer, this.#offset);
			this.#lastBytesRead = dataType.bytes;
			this.#offset += dataType.bytes;
			return value;
		}

		if (dataType.type === 'char') {
			if (dataType.encoding === Encoding.ASCII) {
				return String.fromCharCode(this.next(DataType.UInt8));
			}

			if (dataType.encoding === Encoding.UTF8) {
				const byte1 = this.next(DataType.UInt8);

				if (byte1 < 0x80) {
					return String.fromCharCode(byte1);
				}

				const byte2 = this.next(DataType.UInt8);

				if (byte1 < 0b1110_0000) {
					if ((byte1 >= 0x80 && byte1 < 0b1100_000) || byte2 >= 0b1100_0000) {
						throw new Error(`invalid utf-8 bytes`);
					}
					const code = ((byte1 & 0b0001_1111) << 6) + (byte2 & 0b0011_1111);
					this.#lastBytesRead = 2;
					return String.fromCodePoint(code);
				}

				const byte3 = this.next(DataType.UInt8);

				if (byte1 < 0b1111_0000) {
					if (byte2 >= 0b1100_0000 || byte3 >= 0b1100_0000) {
						throw new Error(`invalid utf-8 bytes`);
					}
					const code = ((byte1 & 0b0000_1111) << 12) + ((byte2 & 0b0011_1111) << 6) + (byte3 & 0b0011_1111);
					this.#lastBytesRead = 3;
					return String.fromCodePoint(code);
				}

				const byte4 = this.next(DataType.UInt8);

				if (byte1 >= 0b1111_1000 || byte2 >= 0b1100_0000 || byte3 >= 0b1100_0000 || byte4 >= 0b1100_0000) {
					throw new Error(`invalid utf-8 bytes`);
				}

				const code =
					((byte1 & 0b0000_0111) << 18) +
					((byte2 & 0b0011_1111) << 12) +
					((byte3 & 0b0011_1111) << 6) +
					(byte4 & 0b0011_1111);

				this.#lastBytesRead = 4;
				return String.fromCodePoint(code);
			}

			if (dataType.encoding === Encoding.UTF16) {
				return String.fromCharCode(this.next(DataType.UInt16));
			}

			if (dataType.encoding === Encoding.UTF32) {
				return String.fromCodePoint(this.next(DataType.UInt32));
			}

			throw new Error(`unsuported encoding`);
		}

		if (dataType.type === 'string') {
			const charType: Char = { type: 'char', encoding: dataType.encoding };

			let result = '';
			let char = this.next(charType);
			let bytesRead = this.#lastBytesRead;

			try {
				while (char !== '\0') {
					result += char;
					char = this.next(charType);
					bytesRead += this.#lastBytesRead;
				}
			} catch (error) {
				if (
					// @ts-expect-error
					!(error instanceof RangeError && ['ERR_BUFFER_OUT_OF_BOUNDS', 'ERR_OUT_OF_RANGE'].includes(error.code))
				) {
					throw error;
				}
			}

			this.#lastBytesRead = bytesRead;
			return result;
		}

		if (dataType.type === 'array') {
			let bytesRead = 0;

			const result = repeat(dataType.count, () => {
				const char = this.next(dataType.subType);
				bytesRead += this.#lastBytesRead;
				return char;
			});

			this.#lastBytesRead = bytesRead;
			return dataType.subType.type === 'char' ? result.join('') : result;
		}

		throw new Error(`unsuported data type`);
	}
}
