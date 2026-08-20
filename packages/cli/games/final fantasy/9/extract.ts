import fs from "node:fs/promises";
import path from "node:path";

import type { Zippable } from "fflate";
import { jsonData, textData } from "@binary-tools/core/encoder";
import { array, object, validate, type Infer } from "@tao/tashikame";
import dedent from "dedent";
import { match, P } from "ts-pattern";
import { parseAllDocuments } from "yaml";

import type { Extractor } from "#/commands/extract.ts";
import { ensure } from "#/util/ensure.ts";
import { Image } from "#/util/image.ts";
import { mapEntries } from "#/util/map-entries.ts";

import { iconMap } from "./assembly-data.ts";
import { aligned, localeMap } from "./load-messages.ts";
import { exportPath } from "./prepare.ts";

type Transformer = (data: { openMarkupTags: string[]; locale: string; parameters: string[]; }) => string;

type IconVariant = {
	readonly for: string;
	readonly locales: readonly string[];
};

const iconVariants: Readonly<Record<string, IconVariant>> = {
	"keyboard_button_backspace_fr_gr_it": {
		for: "keyboard_button_backspace",
		locales: [ "fr-FR", "de-DE", "it-IT", ],
	},
	"keyboard_button_enter_fr_gr": {
		for: "keyboard_button_enter",
		locales: [ "fr-FR", "de-DE", ],
	},
	"keyboard_button_enter_it": {
		for: "keyboard_button_enter",
		locales: [ "it-IT", ],
	},
};

const iconNames = new Set<string>();

const buttonLookup = (type: "joy" | "key", id: string, locale = "ja-JP"): [string, string | undefined] => {
	const [ name, content, ] = match([ type, id, locale, ])
		.returnType<[string, string?]>()
		.with([ "joy", P.union("UP", "DOWN", "LEFT", "RIGHT"), P._, ], () => {
			return [ `ps_dpad_${id.toLowerCase()}`, ];
		})
		.with([ "key", P.union("UP", "DOWN", "LEFT", "RIGHT"), P._, ], () => {
			return [ `keyboard_button_arrow_${id.toLowerCase()}`, ];
		})
		.with([ "joy", "PAD", P._, ], () => {
			return [ "ps_dpad", ];
		})
		.with([ "joy", "SELECT", P._, ], () => {
			return [ "joystick_select", ];
		})
		.with([ "key", "SELECT", P._, ], () => {
			return [ "keyboard_button", "1", ];
		})
		.with([ "joy", "START", P._, ], () => {
			return [ "joystick_start", ];
		})
		.with([ "key", "START", P._, ], () => {
			return [ "keyboard_button_backspace", ];
		})
		.with([ "joy", "CIRCLE", "ja-JP", ], () => {
			return [ "joystick_button_b", ];
		})
		.with([ "joy", "CIRCLE", P._, ], () => {
			return [ "joystick_button_a", ];
		})
		.with([ "key", "CIRCLE", "ja-JP", ], () => {
			return [ "keyboard_button", "X", ];
		})
		.with([ "key", "CIRCLE", P._, ], () => {
			return [ "keyboard_button", "C", ];
		})
		.with([ "joy", "CROSS", "ja-JP", ], () => {
			return [ "joystick_button_a", ];
		})
		.with([ "joy", "CROSS", P._, ], () => {
			return [ "joystick_button_b", ];
		})
		.with([ "key", "CROSS", "ja-JP", ], () => {
			return [ "keyboard_button", "C", ];
		})
		.with([ "key", "CROSS", P._, ], () => {
			return [ "keyboard_button", "X", ];
		})
		.with([ "joy", "TRIANGLE", P._, ], () => {
			return [ "joystick_button_y", ];
		})
		.with([ "key", "TRIANGLE", P._, ], () => {
			return [ "keyboard_button", "V", ];
		})
		.with([ "joy", "SQUARE", P._, ], () => {
			return [ "joystick_button_x", ];
		})
		.with([ "key", "SQUARE", P._, ], () => {
			return [ "keyboard_button", "B", ];
		})
		.with([ "joy", "R1", P._, ], () => {
			return [ "joystick_r1", ];
		})
		.with([ "key", "R1", P._, ], () => {
			return [ "keyboard_button", "H", ];
		})
		.with([ "joy", "R2", P._, ], () => {
			return [ "joystick_r2", ];
		})
		.with([ "key", "R2", P._, ], () => {
			return [ "keyboard_button", "J", ];
		})
		.with([ "joy", "L1", P._, ], () => {
			return [ "joystick_l1", ];
		})
		.with([ "key", "L1", P._, ], () => {
			return [ "keyboard_button", "G", ];
		})
		.with([ "joy", "L2", P._, ], () => {
			return [ "joystick_l2", ];
		})
		.with([ "key", "L2", P._, ], () => {
			return [ "keyboard_button", "F", ];
		})
		.run();

	iconNames.add(name);

	return [ name.replaceAll("_", "-"), content, ];
};

const closeHtml = (tags: string[]) => {
	const result = tags.map((tag) => `</${tag}>`).join("");
	tags.length = 0;
	return result;
};

const colorStart = (color: string): Transformer => ({ openMarkupTags, }) => {
	const result = `${closeHtml(openMarkupTags)}<span class="color ${color}">`;
	openMarkupTags.unshift("span");
	return result;
};

const transformers: Record<string, Transformer> = {
	"B880E0": colorStart("pink"),
	"68C0D8": colorStart("cyan"),
	"D06050": colorStart("gold"),
	"C8B040": colorStart("yellow"),
	"78C840": colorStart("green"),
	"909090": colorStart("grey"),
	"A85038": colorStart("brown"),
	"383838": ({ openMarkupTags, }) => closeHtml(openMarkupTags),
	"C8C8C8": ({ openMarkupTags, }) => closeHtml(openMarkupTags),
	"CARD": () => `<span class="placeholder">#</span>`,
	"ZDNE": () => `<player-name character="ff9:zidane"></player-name>`,
	"VIVI": () => `<player-name character="ff9:vivi"></player-name>`,
	"DGGR": () => `<player-name character="ff9:dagger"></player-name>`,
	"STNR": () => `<player-name character="ff9:steiner"></player-name>`,
	"FRYA": () => `<player-name character="ff9:freya"></player-name>`,
	"QUIN": () => `<player-name character="ff9:quina"></player-name>`,
	"EIKO": () => `<player-name character="ff9:eiko"></player-name>`,
	"AMRT": () => `<player-name character="ff9:amarant"></player-name>`,
	"PTY1": () => `<span class="placeholder">1</span>`,
	"PTY2": () => `<span class="placeholder">2</span>`,
	"PTY3": () => `<span class="placeholder">3</span>`,
	"PTY4": () => `<span class="placeholder">4</span>`,
	"DBTN": ({ locale, parameters: [ id, ], }) => `<span class="icon ${buttonLookup("joy", ensure(id), locale)[0]}"></span>`,
	"CBTN": ({ locale, parameters: [ id, ], }) => `<span class="icon ${buttonLookup("joy", ensure(id), locale)[0]}"></span>`,
	"JCBT": ({ locale, parameters: [ id, ], }) => `<span class="icon ${buttonLookup("joy", ensure(id), locale)[0]}"></span>`,
	"KCBT": ({ locale, parameters: [ id, ], }) => {
		const [ style, content = "", ] = buttonLookup("key", ensure(id), locale);
		return `<span class="icon ${style}">${content}</span>`;
	},
	"MOVE": () => `\t`,
	"TEXT": ({ parameters: [ _, id, ], }) => `<span class="placeholder">${id}</span>`,
	"ITEM": ({ parameters: [ id, ], }) => `<span class="placeholder">${id}</span>`,
	"NUMB": () => `<span class="placeholder">#</span>`,
	"ICON": ({ locale, parameters: [ id, ], }) => {
		switch (id) {
			case "34":
				return `<sub>0</sub>`;
			case "35":
				return `<sub>1</sub>`;
			case "39":
				return `<sub>5</sub>`;
			case "45":
				return `<sub>/</sub>`;
			case "159":
				return `<sup>${aligned.get([ "manifest", "localization.txt", "Miss", locale, ])}</sup>`;
			case "160":
				return `<sup>${aligned.get([ "manifest", "localization.txt", "Death", locale, ])}</sup>`;
			case "161":
				return `<sup>${aligned.get([ "manifest", "localization.txt", "Guard", locale, ])}</sup>`;
			case "163":
				return `<sup>${aligned.get([ "manifest", "localization.txt", "MPCaption", locale, ])}</sup>`;
			case "173":
				return `9`;
			case "174":
				return `/`;
			case "179":
				return `<sup class="color yellow">${aligned.get([ "manifest", "localization.txt", "Critical", locale, ])}</sup>`;
		}

		const name = ensure(iconMap[ensure(id)]);

		iconNames.add(name);

		return `<span class="icon ${name.replaceAll("_", "-")}"></span>`;
	},
};

export const extract: Extractor = async ({ html, }) => {
	const transform = (message: string, locale: string, openMarkupTags: string[] = []) => {
		const transformedMessage = [ ...message.matchAll(/\[([A-Z0-9]+?)(?:=(.+?))?\]/g), ].reduce(
			(result, [ matchValue, tag, parameters, ]) => {
				return result.replace(
					matchValue,
					transformers[ensure(tag)]?.({ locale, openMarkupTags, parameters: parameters?.split(",") ?? [], }) ?? "",
				);
			},
			html.encode(message),
		);

		const resultMessage = `${transformedMessage.trim()}${closeHtml(openMarkupTags)}`;

		html.validate(resultMessage);

		return resultMessage;
	};

	const extractLocale = (locale: string, entry: Record<string, string>) => {
		const message = entry[locale];

		if (!message) {
			return "";
		}

		return transform(message, locale);
	};

	const zipData: Zippable = {};
	const fileList = new Set<string>();

	for (const locale of Object.values(localeMap)) {
		const messages = {
			"manifest/text/localization.txt": mapEntries(aligned.get([ "manifest", "localization.txt", ]), (name, entries) => {
				console.log(locale, `manifest/text/localization.txt ${name}`);
				return [ name, extractLocale(locale, entries), ];
			}),
			...mapEntries(aligned.get([ "field", ]), (file, entries) => {
				const list = Object.values(entries).map((entry, index) => {
					console.log(locale, `field/${file} #${index}`);
					return extractLocale(locale, entry);
				});
				return [ `text/field/${file}`, list, ] as const;
			}),
			...mapEntries(aligned.get([ "item", ]), (file, entries) => {
				const list = Object.values(entries).map((entry, index) => {
					console.log(locale, `item/${file} #${index}`);
					return extractLocale(locale, entry);
				});
				return [ `text/item/${file}`, list, ] as const;
			}),
			...mapEntries(aligned.get([ "keyitem", ]), (file, entries) => {
				const list = Object.values(entries).map((entry, index) => {
					console.log(locale, `keyitem/${file} #${index}`);
					return extractLocale(locale, entry);
				});
				return [ `text/keyitem/${file}`, list, ] as const;
			}),
			...mapEntries(aligned.get([ "ability", ]), (file, entries) => {
				const list = Object.values(entries).map((entry, index) => {
					console.log(locale, `ability/${file} #${index}`);
					return extractLocale(locale, entry);
				});
				return [ `text/ability/${file}`, list, ] as const;
			}),
			...mapEntries(aligned.get([ "command", ]), (file, entries) => {
				const list = Object.values(entries).map((entry, index) => {
					console.log(locale, `command/${file} #${index}`);
					return extractLocale(locale, entry);
				});
				return [ `text/command/${file}`, list, ] as const;
			}),
			...mapEntries(aligned.get([ "battle", ]), (file, entries) => {
				const list = Object.values(entries).map((entry, index) => {
					console.log(locale, `battle/${file} #${index}`);
					return extractLocale(locale, entry);
				});
				return [ `text/battle/${file}`, list, ] as const;
			}),
			"text/location/loc_name.mes": mapEntries(aligned.get([ "location", "loc_name.mes", ]), (id, entries) => {
				console.log(locale, `manifest/text/localization.txt ${id}`);
				return [ id, extractLocale(locale, entries), ];
			}),
			...mapEntries(aligned.get([ "etc", ]), (file, entries) => {
				const list = Object.values(entries).map((entry, index) => {
					console.log(locale, `etc/${file} #${index}`);
					return extractLocale(locale, entry);
				});
				return [ `text/etc/${file}`, list, ] as const;
			}),
			...mapEntries(aligned.get([ "title", ]), (file, entries) => {
				const list = Object.values(entries).map((entry, index) => {
					console.log(locale, `title/${file} #${index}`);
					return extractLocale(locale, entry);
				});
				return [ `text/title/${file}`, list, ] as const;
			}),
		};

		for (const filePath of Object.keys(messages)) {
			fileList.add(filePath);
		}

		zipData[`data/${locale}.json`] = jsonData(messages);
	}

	zipData["files.json"] = jsonData(Array.from(fileList));

	const IconSprite = object({
		name: "string",
		x: "number",
		y: "number",
		width: "number",
		height: "number",
		paddingLeft: "number",
		paddingRight: "number",
		paddingTop: "number",
		paddingBottom: "number",
	}, {
		additionalProperties: true,
	});

	const IconsPrefab = object({
		MonoBehaviour: object({
			mSprites: array(IconSprite),
		}, {
			additionalProperties: true,
		}),
	});

	const iconSprites = new Map<Infer<typeof IconSprite>, string>();

	for (const source of [ "Icon Atlas", "TutorialUI Atlas", ]) {
		const atlasDir = path.join(exportPath, "ExportedProject/Assets/Resources/embeddedasset/ui/atlas");
		const sheet = await Image.loadPng(path.join(atlasDir, `${source}.png`));
		const prefabSource = await fs.readFile(path.join(atlasDir, `${source}.prefab`), "utf-8");
		const prefab = parseAllDocuments(prefabSource, { stringKeys: true, });
		const iconsPrefab = validate(IconsPrefab, prefab[2]?.toJSON());

		for (const sprite of iconsPrefab.MonoBehaviour.mSprites) {
			const variant = iconVariants[sprite.name];

			if (!iconNames.has(sprite.name) && !(variant && iconNames.has(variant.for))) {
				continue;
			}

			console.log("icon", sprite.name);

			const { x, y, width, height, } = sprite;
			const { paddingLeft: left, paddingRight: right, paddingTop: top, paddingBottom: bottom, } = sprite;

			const png = await sheet
				.crop({ x, y, width, height, })
				.pad({ left, right, top, bottom, }, [ 0, 0, 0, 0, ])
				.toPng();

			iconSprites.set(sprite, png.data.toBase64());
		}
	}

	const styles = dedent.withOptions({ alignValues: true, })/* css */`
		.color.pink {
			color: #b880e0;
		}

		.color.cyan {
			color: #68c0d8;
		}

		.color.gold {
			color: #d06050;
		}

		.color.yellow {
			color: #c8b040;
		}

		.color.green {
			color: #78c840;
		}

		.color.grey {
			color: #909090;
		}

		.color.brown {
			color: #a85038;
		}

		.icon {
			display: inline-block;
			vertical-align: text-bottom;
			height: calc(var(--height) / 64 * var(--inline-height, 1em));
			width: calc(var(--width) * var(--inline-height, 1em) / 64);
			background-size: cover;
			filter: drop-shadow(0.02em 0.02em 0.04em hsl(0 0% 0%));
			vertical-align: middle;
		}

		${[ ...iconSprites.entries(), ].map(([ sprite, data, ]) => {
			const width = sprite.width + sprite.paddingLeft + sprite.paddingRight;
			const height = sprite.height + sprite.paddingTop + sprite.paddingBottom;
			const dataUrl = `data:image/png;base64,${data}`;

			if (sprite.name === "keyboard_button") {
				return dedent/* css */`
					.icon.keyboard-button {
						--width: ${width};
						--height: ${height};
						background-image: url("${dataUrl}");
						font-size: 0.5em;
						place-content: center;
					}
				`;
			}

			const variant = iconVariants[sprite.name];

			if (variant) {
				return dedent/* css */`
					:is(${variant.locales.map((locale) => `[lang="${locale}"]`).join(", ")}) .icon.${variant.for.replaceAll("_", "-")} {
						background-image: url("${dataUrl}");
					}
				`;
			}

			return dedent/* css */`
				.icon.${sprite.name.replaceAll("_", "-")} {
					--width: ${width};
					--height: ${height};
					background-image: url("${dataUrl}");
				}
			`;
		}).join("\n\n")}
	`;

	zipData["styles.css"] = textData(styles);

	return zipData;
};
