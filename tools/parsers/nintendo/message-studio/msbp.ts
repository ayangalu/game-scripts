import { repeat, DataType, Encoding } from '@nishin/reader';

import { LMS, processLabelBlock } from './lms';

type Color = [number, number, number, number];

interface AttributeInformation {
	readonly type: number;
	readonly index: number;
	readonly offset: number;
}

interface TagGroup {
	readonly name: string;
	readonly tags: number[];
	readonly unknown: number;
}

interface Tag {
	name: string;
	parameters: number[];
}

interface TagParameter {
	name: string;
	type: number;
	listItems: number[];
}

interface Style {
	regionWidth: number;
	lineNumber: number;
	fontIndex: number;
	baseColorIndex: number;
}

interface Blocks {
	CLR1: Color[];
	CLB1: string[];
	ATI2: AttributeInformation[];
	ALB1: string[];
	ALI2: string[][];
	TGG2: TagGroup[];
	TAG2: Tag[];
	TGP2: TagParameter[];
	TGL2: string[];
	SYL3: Style[];
	SLB1: string[];
	CTI1: string[];
}

// https://github.com/kinnay/Nintendo-File-Formats/wiki/MSBP-File-Format
export class MSBP extends LMS<Blocks> {
	get colors() {
		return this.mapLabels(this.blocks.CLB1, this.blocks.CLR1);
	}

	get attributes() {
		return this.mapLabels(
			this.blocks.ALB1,
			(this.blocks.ATI2 ?? []).map(({ type, index, offset }) => {
				const listItems = this.blocks.ALI2?.[index];

				if (!listItems) {
					throw new Error(`missing attribute list items entry`);
				}

				return {
					type,
					listItems,
					offset,
				};
			}),
		);
	}

	get tags() {
		if (!this.blocks.TGG2) {
			return [];
		}

		return this.blocks.TGG2.map((group) => {
			return {
				name: group.name,
				tags: group.tags.map((tagIndex) => {
					const tag = this.blocks.TAG2?.[tagIndex];

					if (!tag) {
						throw new Error(`missing tag`);
					}

					return {
						name: tag.name,
						parameters: tag.parameters.map((parameterIndex) => {
							const parameter = this.blocks.TGP2?.[parameterIndex];

							if (!parameter) {
								throw new Error(`missing tag parameter`);
							}

							return {
								name: parameter.name,
								type: parameter.type,
								listItems: parameter.listItems.map((itemIndex) => {
									const item = this.blocks.TGL2?.[itemIndex];

									if (typeof item !== 'string') {
										throw new Error(`missing tag parameter list item`);
									}

									return item;
								}),
							};
						}),
					};
				}),
			};
		});
	}

	get styles() {
		return this.mapLabels(this.blocks.SLB1, this.blocks.SYL3);
	}

	constructor(source: string | Buffer) {
		super(source, 'MsgPrjBn', [4], {
			CLR1: (reader) => {
				return repeat(reader.next(DataType.Uint32).value, () => {
					return reader.next(DataType.array(DataType.Uint8, 4)).value as Color;
				});
			},
			CLB1: processLabelBlock,
			ATI2: (reader) => {
				return repeat(reader.next(DataType.Uint32).value, () => {
					const type = reader.next(DataType.Uint8).value;
					reader.skip(1);
					const index = reader.next(DataType.Uint16).value;
					const offset = reader.next(DataType.Uint32).value;
					return { type, index, offset };
				});
			},
			ALB1: processLabelBlock,
			ALI2: (reader) => {
				return repeat(reader.next(DataType.Uint32).value, () => reader.next(DataType.Uint32).value).map((listOffset) => {
					reader.seek(listOffset);
					return repeat(reader.next(DataType.Uint32).value, () => reader.next(DataType.Uint32).value).map((itemOffset) => {
						reader.seek(listOffset + itemOffset);
						return reader.next(DataType.string(Encoding.ASCII)).value;
					});
				});
			},
			TGG2: (reader) => {
				// TODO: verify that this is really Uint16
				const count = reader.next(DataType.Uint16).value;
				reader.skip(2);
				return repeat(count, () => reader.next(DataType.Uint32).value).map((offset) => {
					reader.seek(offset);
					const unknown = reader.next(DataType.Uint16).value;
					const tags = repeat(reader.next(DataType.Uint16).value, () => reader.next(DataType.Uint16).value);
					const name = reader.next(DataType.string(Encoding.ASCII)).value;
					return { name, tags, unknown };
				});
			},
			TAG2: (reader) => {
				const count = reader.next(DataType.Uint16).value;
				reader.skip(2);
				return repeat(count, () => reader.next(DataType.Uint32).value).map((offset) => {
					reader.seek(offset);
					const parameters = repeat(reader.next(DataType.Uint16).value, () => reader.next(DataType.Uint16).value);
					const name = reader.next(DataType.string(Encoding.ASCII)).value;
					return { name, parameters };
				});
			},
			TGP2: (reader) => {
				const count = reader.next(DataType.Uint16).value;
				reader.skip(2);
				return repeat(count, () => reader.next(DataType.Uint32).value).map((offset) => {
					reader.seek(offset);
					const type = reader.next(DataType.Uint8).value;
					if (type === 9) {
						reader.skip(1);
						const listItems = repeat(reader.next(DataType.Uint16).value, () => reader.next(DataType.Uint16).value);
						const name = reader.next(DataType.string(Encoding.ASCII)).value;
						return { type, name, listItems };
					}
					const name = reader.next(DataType.string(Encoding.ASCII)).value;
					return { type, name, listItems: [] };
				});
			},
			TGL2: (reader) => {
				const count = reader.next(DataType.Uint16).value;
				reader.skip(2);
				return repeat(count, () => reader.next(DataType.Uint32).value).map((offset) => {
					reader.seek(offset);
					return reader.next(DataType.string(Encoding.ASCII)).value;
				});
			},
			SYL3: (reader) => {
				return repeat(reader.next(DataType.Uint32).value, () => {
					return {
						regionWidth: reader.next(DataType.Uint32).value,
						lineNumber: reader.next(DataType.Uint32).value,
						fontIndex: reader.next(DataType.Uint32).value,
						baseColorIndex: reader.next(DataType.Uint32).value,
					};
				});
			},
			SLB1: processLabelBlock,
			CTI1: (reader) => {
				return repeat(reader.next(DataType.Uint32).value, () => reader.next(DataType.Uint32).value).map((offset) => {
					reader.seek(offset);
					return reader.next(DataType.string(Encoding.ASCII)).value;
				});
			},
		});
	}
}
