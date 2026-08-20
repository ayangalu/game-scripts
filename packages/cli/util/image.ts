import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { decodePng, encodePng } from "@lunapaint/png-codec";

import { ensure } from "./ensure.ts";

export type Pixel = [r: number, g: number, b: number, a: number];
export type Image2D = Pixel[][];

type PaddingDimensions = {
	readonly left?: number;
	readonly right?: number;
	readonly top?: number;
	readonly bottom?: number;
};

type CropView = {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
};

export class Image {
	static async loadPng(path: string) {
		const png = await decodePng(await fs.readFile(path), { force32: true, });
		const { data, width, height, } = png.image;
		return new Image(data, width, height);
	}

	readonly data: Image2D = [];
	readonly buffer: Uint8Array;
	readonly width: number;
	readonly height: number;

	constructor(buffer: Uint8Array, width: number, height: number) {
		assert(buffer.byteLength === width * height * 4);

		this.buffer = buffer;
		this.width = width;
		this.height = height;

		for (let y = 0; y < height; y++) {
			const row: Pixel[] = [];

			for (let x = 0; x < width; x++) {
				const p = x * 4 + y * width * 4;
				row.push([
					ensure(buffer[p]),
					ensure(buffer[p + 1]),
					ensure(buffer[p + 2]),
					ensure(buffer[p + 3]),
				]);
			}

			this.data.push(row);
		}
	}

	pad({ left = 0, right = 0, top = 0, bottom = 0, }: PaddingDimensions, pixel = ensure(this.data[0]?.[0])) {
		const result = structuredClone(this.data);
		const width = this.width + left + right;
		const height = this.height + top + bottom;

		for (const row of result) {
			for (let i = 0; i < left; i++) {
				row.unshift(pixel);
			}
			for (let i = 0; i < right; i++) {
				row.push(pixel);
			}
		}

		for (let i = 0; i < top; i++) {
			result.unshift(new Array<Pixel>(width).fill(pixel));
		}

		for (let i = 0; i < bottom; i++) {
			result.push(new Array<Pixel>(width).fill(pixel));
		}

		return new Image(new Uint8Array(result.flat(2)), width, height);
	}

	crop({ x, y, width, height, }: CropView) {
		assert(x >= 0);
		assert(x + width <= this.width);
		assert(y >= 0);
		assert(y + height <= this.height);

		const result = new Uint8Array(width * height * 4);

		let offset = 0;

		for (let r = y; r < y + height; r++) {
			for (let c = x; c < x + width; c++) {
				result.set(ensure(this.data[r]?.[c]), offset);
				offset += 4;
			}
		}

		return new Image(result, width, height);
	}

	flipY() {
		return new Image(new Uint8Array(this.data.toReversed().flat(2)), this.width, this.height);
	}

	async toPng() {
		return encodePng({
			data: this.buffer,
			width: this.width,
			height: this.height,
		});
	}
}
