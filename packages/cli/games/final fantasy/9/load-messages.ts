import { readFile } from "node:fs/promises";
import path from "node:path";

import { array, tuple, validate } from "@tao/tashikame";
import { parse as csvParse } from "csv-parse/sync";
import { glob } from "glob";

import { ensure } from "#/util/ensure.ts";
import { nestedRecord } from "#/util/nested-record.ts";

import { fieldAlignment, ragtimeAlignment, ragtimeFiles, type Alignment } from "./alignments.ts";
import { eventMessageMap, messageDB, mogIconOpCode, sceneData } from "./assembly-data.ts";
import { exportPath } from "./prepare.ts";

const resourcesPath = path.join(exportPath, "ExportedProject/Assets/Resources");
const assetsPath = path.join(resourcesPath, "embeddedasset");
const textsPath = path.join(assetsPath, "text");

export const raw = nestedRecord<3, string>();

for (const entry of await glob(`*/*/*.{mes,txt}`, { cwd: textsPath, withFileTypes: true, })) {
	// AssetRipper exports some assets with duplicate extensions, e.g. *.mes.mes or *.txt.txt
	const rawPath = validate(tuple([ "string", "string", "string", ]), entry.relativePosix().replace(/(\..+?)\1$/, "$1").split("/"));
	const data = await readFile(entry.fullpath(), "utf-8");
	raw.set(rawPath, data);
}

export const localeMap: Record<string, string> = {
	es: "es-ES",
	fr: "fr-FR",
	gr: "de-DE",
	it: "it-IT",
	jp: "ja-JP",
	uk: "en-GB",
	us: "en-US",
};

const align = (source: Record<string, string[]>, data: Alignment) => {
	const rows = Array.from({ length: data.max, }).map((_, index) =>{
		return Object.entries(source)
			.reduce((result, [ locale, messages, ]) => {
				const l = ensure(localeMap[locale]);
				if (data.blanks?.[locale]?.includes(index)) {
					result.set([ l, ], "");
				} else {
					result.set([ l, ], messages.shift() ?? "");
				}

				return result;
			}, nestedRecord<1, string>())
			.source;
	});

	Object.keys(source).forEach((locale) => {
		data.swap?.[locale]?.forEach(([ a, b, ]) => {
			const l = ensure(localeMap[locale]);
			[ rows[a]![l], rows[b]![l], ] = [ rows[b]![l]!, rows[a]![l]!, ];
		});
	});

	return rows.filter((row) => Object.values(row).some((message) => message.trim()));
};

const fieldOrder = [ 1, ...new Set(Object.values(eventMessageMap)), ];
const battleOrder = [ ...new Set(Object.values(sceneData)), ];

export const aligned = nestedRecord<4, string>();

const simpleSplit = (source: string) => {
	for (const file of Object.keys(raw.get([ "jp", source, ]))) {
		for (const locale of Object.keys(raw.source)) {
			for (const [ index, name, ] of raw.get([ locale, source, file, ]).split(/(?<=\[ENDN\])/).entries()) {
				const value = file === "follow.mes" && index >= 8 ? name.slice(1).replace(/%|&/, `[CARD]`) : name;
				aligned.set([ source, file, index, ensure(localeMap[locale]), ], value.replaceAll("\r\n", "\n"));
			}
		}
	}
};

const localization = validate(
	array(array("string")),
	csvParse(await readFile(path.join(assetsPath, "manifest/text/Localization.txt.txt")), {
		skipEmptyLines: true,
		skipRecordsWithEmptyValues: true,
		relaxColumnCount: true,
		cast: (value) => value.replaceAll("\\n", "\n").replaceAll("{0}", "[CARD]"),
	}),
);

const localizationNameIndexes = [ 0, 1, 2, 6, 4, 3, 5, ];

for (const [ key, ...data ] of localization.slice(1)) {
	const locales = [ "en-US", "en-GB", "ja-JP", "es-ES", "fr-FR", "de-DE", "it-IT", ];
	for (const [ index, locale, ] of locales.entries()) {
		const message = key === "Name" ? data[ensure(localizationNameIndexes[index])] : data[index] ?? data[0];
		aligned.set([ "manifest", "localization.txt", ensure(key), locale, ], ensure(message));
	}
}

const fieldEntries =  Object.keys(raw.get([ "jp", "field", ]))
	.map((file) => {
		const data: Record<string, string[]> = {};

		for (const locale of Object.keys(raw.source)) {
			let messages = raw.get([ locale, "field", ])[file];

			if (!messages) {
				continue;
			}

			for (const [ source, replacer, ] of Object.entries(mogIconOpCode)) {
				messages = messages.replaceAll(source, ensure(replacer));
			}

			data[locale] = messages
				.split(/(?<=\[(?:ENDN|TIME=-?\d+?)\])/)
				.map((message) => message.replaceAll("\r\n", "\n"));
		}

		if (file in fieldAlignment) {
			return [ file, align(data, ensure(fieldAlignment[file])), ] as const;
		}

		return [ file, align(data, { max: ensure(data.jp).length, }), ] as const;
	})
	.sort(([ a, ], [ b, ]) => {
		const lookup = (value: string) => (id: number) => new RegExp(`^${id}m?\\.mes$`).test(value);
		return fieldOrder.findIndex(lookup(a)) - fieldOrder.findIndex(lookup(b));
	});

for (const [ file, data, ] of fieldEntries) {
	for (const [ index, item, ] of data.entries()) {
		for (const [ locale, message, ] of Object.entries(item)) {
			aligned.set([ "field", `${file} (${messageDB[parseInt(file)]})`, index, locale, ], message);
		}
	}
}

simpleSplit("item");
simpleSplit("keyitem");
simpleSplit("ability");
simpleSplit("command");

const battleEntries = Object.keys(raw.get([ "jp", "battle", ]))
	.filter((file) => file.endsWith(".mes"))
	.map((file) => {
		const data: Record<string, string[]> = {};

		for (const locale of Object.keys(raw.source)) {
			data[locale] = raw.get([ locale, "battle", file, ]).split(/(?<=\[ENDN\])/);
		}

		if (ragtimeFiles.includes(file)) {
			return [ file, align(data, ragtimeAlignment), ] as const;
		}

		return [ file, align(data, { max: ensure(data.jp).length, }), ] as const;
	})
	.sort(([ a, ], [ b, ]) => {
		const findIndex = (file: string) => {
			const id = parseInt(file);
			return battleOrder.findIndex((value) => value === id);
		};
		return findIndex(a) - findIndex(b);
	});

for (const [ file, data, ] of battleEntries) {
	const nameEN = ensure(data[0]?.["en-US"]).replaceAll(/\[.+?\]/gu, "");
	const name = nameEN === "„♂" ? "ヴァイス" : nameEN || "Steiner";
	for (const [ index, item, ] of data.entries()) {
		for (const [ locale, message, ] of Object.entries(item)) {
			aligned.set([ "battle", `${file} (${name})`, index, locale, ], message);
		}
	}
}

for (const locale of Object.keys(raw.source)) {
	const locations = raw.get([ locale, "location", "loc_name.mes", ])
		.split(/(?<=\[ENDN\]\r\n)/)
		.sort((a, b) => a.localeCompare(b, "en-US", { numeric: true, }));

	for (const value of locations) {
		const [ index, name, ] = value.split(":");
		aligned.set([ "location", "loc_name.mes", ensure(index), ensure(localeMap[locale]), ], ensure(name).trim());
	}
}

simpleSplit("etc");

for (const locale of Object.keys(raw.source)) {
	const message = raw.get([ locale, "title", "warning.txt", ]).trim().replaceAll("\r\n", "\n");
	aligned.set([ "title", "warning.txt", 0, ensure(localeMap[locale]), ], message);
}
