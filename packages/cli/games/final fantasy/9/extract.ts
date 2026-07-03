import fs from "node:fs/promises";
import path from "node:path";

import { array, object, validate, type Infer } from "@tao/tashikame";
import dedent from "dedent";
import { match, P } from "ts-pattern";
import { parseAllDocuments } from "yaml";

import type { Extractor } from "#/commands/extract.ts";
import { ensure } from "#/util/ensure.ts";
import { Image } from "#/util/image.ts";
import { mapEntries } from "#/util/map-entries.ts";
import { Skeleton } from "#/util/skeleton.ts";

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

export const extract: Extractor = async ({ html, targetDir, dataDir, }) => {
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
			return {};
		}

		return {
			[locale]: transform(message, locale),
		};
	};

	const skeleton = new Skeleton(targetDir);

	for (const locale of Object.values(localeMap)) {
		const messages = {
			"localization.txt": mapEntries(aligned.get([ "manifest", "localization.txt", ]), (entries, name) => {
				console.log(locale, `manifest/text/localization.txt/${name}`);
				return extractLocale(locale, entries);
			}),
			"field": mapEntries(aligned.get([ "field", ]), (entries, file) => {
				return Object.entries(entries).map(([ index, entry, ]) => {
					console.log(locale, `field/${file} #${index}`);
					return extractLocale(locale, entry);
				});
			}),
			"item": mapEntries(aligned.get([ "item", ]), (entries, file) => {
				return Object.entries(entries).map(([ index, entry, ]) => {
					console.log(locale, `item/${file} #${index}`);
					return extractLocale(locale, entry);
				});
			}),
			"keyitem": mapEntries(aligned.get([ "keyitem", ]), (entries, file) => {
				return Object.entries(entries).map(([ index, entry, ]) => {
					console.log(locale, `keyitem/${file} #${index}`);
					return extractLocale(locale, entry);
				});
			}),
			"ability": mapEntries(aligned.get([ "ability", ]), (entries, file) => {
				return Object.entries(entries).map(([ index, entry, ]) => {
					console.log(locale, `ability/${file} #${index}`);
					return extractLocale(locale, entry);
				});
			}),
			"command": mapEntries(aligned.get([ "command", ]), (entries, file) => {
				return Object.entries(entries).map(([ index, entry, ]) => {
					console.log(locale, `command/${file} #${index}`);
					return extractLocale(locale, entry);
				});
			}),
			"battle": mapEntries(aligned.get([ "battle", ]), (entries, file) => {
				return Object.entries(entries).map(([ index, entry, ]) => {
					console.log(locale, `battle/${file} #${index}`);
					return extractLocale(locale, entry);
				});
			}),
			"location": {
				"loc_name.mes": mapEntries(aligned.get([ "location", "loc_name.mes", ]), (entries, index) => {
					console.log(locale, `location/log_name.mes #${index}`);
					return extractLocale(locale, entries);
				}),
			},
			"etc": mapEntries(aligned.get([ "etc", ]), (entries, file) => {
				return Object.entries(entries).map(([ index, entry, ]) => {
					console.log(locale, `etc/${file} #${index}`);
					return extractLocale(locale, entry);
				});
			}),
			"title": mapEntries(aligned.get([ "title", ]), (entries, file) => {
				return Object.entries(entries).map(([ index, entry, ]) => {
					console.log(locale, `title/${file} #${index}`);
					return extractLocale(locale, entry);
				});
			}),
		};

		skeleton.update(messages);
		await fs.writeFile(path.join(dataDir, `${locale}.json`), JSON.stringify(messages));
	}

	skeleton.persist();

	const iconsPath = path.join(targetDir, "icons");

	await fs.mkdir(iconsPath, { recursive: true, });

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

	const iconSprites: Array<Infer<typeof IconSprite>> = [];

	for (const source of [ "Icon Atlas", "TutorialUI Atlas", ]) {
		const atlasDir = path.join(exportPath, "ExportedProject/Assets/Resources/embeddedasset/ui/atlas");
		const sheet = await Image.load(path.join(atlasDir, `${source}.png`));
		const prefabSource = await fs.readFile(path.join(atlasDir, `${source}.prefab`), "utf-8");
		const prefab = parseAllDocuments(prefabSource, { stringKeys: true, });
		const iconsPrefab = validate(IconsPrefab, prefab[2]?.toJSON());

		for (const sprite of iconsPrefab.MonoBehaviour.mSprites) {
			const variant = iconVariants[sprite.name];

			if (!iconNames.has(sprite.name) && !(variant && iconNames.has(variant.for))) {
				continue;
			}

			console.log("icon", sprite.name);

			iconSprites.push(sprite);

			const { x, y, width, height, } = sprite;
			const { paddingLeft: left, paddingRight: right, paddingTop: top, paddingBottom: bottom, } = sprite;

			await sheet
				.crop({ x, y, width, height, })
				.pad({ left, right, top, bottom, }, [ 0, 0, 0, 0, ])
				.toPng(path.join(iconsPath, `${sprite.name}.png`));
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

		${iconSprites.map((sprite) => {
			const width = sprite.width + sprite.paddingLeft + sprite.paddingRight;
			const height = sprite.height + sprite.paddingTop + sprite.paddingBottom;

			if (sprite.name === "keyboard_button") {
				return dedent/* css */`
					.icon.keyboard-button {
						--width: ${width};
						--height: ${height};
						background-image: url("icons/keyboard_button.png");
						font-size: 0.5em;
						place-content: center;
					}
				`;
			}

			const variant = iconVariants[sprite.name];

			if (variant) {
				return dedent/* css */`
					:is(${variant.locales.map((locale) => `[lang="${locale}"]`).join(", ")}) .icon.${variant.for.replaceAll("_", "-")} {
						background-image: url("icons/${sprite.name}.png");
					}
				`;
			}

			return dedent/* css */`
				.icon.${sprite.name.replaceAll("_", "-")} {
					--width: ${width};
					--height: ${height};
					background-image: url("icons/${sprite.name}.png");
				}
			`;
		}).join("\n\n")}
	`;

	await fs.writeFile(path.join(targetDir, "styles.css"), styles, "utf-8");
};
