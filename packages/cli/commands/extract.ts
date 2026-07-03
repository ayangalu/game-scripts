import fs from "node:fs/promises";
import path from "node:path";

import type { Promisable } from "type-fest";
import { validate } from "@tao/tashikame";

import { GameEntry } from "@game-scripts/schema/game-entry";

import { HtmlTools } from "#/util/html-tools.ts";

import { selectEntry } from "./select-entry.ts";

export type ExtractMeta = {
	readonly platform: string;
	readonly entry: GameEntry;
	readonly targetDir: string;
	readonly dataDir: string;
	readonly html: HtmlTools;
};

export type Extractor = (meta: ExtractMeta) => Promisable<void>;

const gameRoot = await selectEntry("extract");
const html = new HtmlTools(gameRoot);

const { extract, } = await import(`#/${gameRoot}/extract.ts`) as { extract: Extractor; };

process.on("SIGINT", () => html.persistCache());
process.on("SIGQUIT", () => html.persistCache());
process.on("SIGTERM", () => html.persistCache());

try {
	for (const variant of await fs.readdir(path.join(gameRoot, "meta"))) {
		const platform = path.parse(variant).name;
		const entry = validate(GameEntry, JSON.parse(await fs.readFile(path.join(gameRoot, "meta", variant), "utf-8")));
		const targetDir = process.argv.includes("--prod") ? `../display/public/games/${entry.id}` : `${gameRoot}/.temp/${entry.id}`;
		const dataDir = `${targetDir}/data`;

		await fs.mkdir(dataDir, { recursive: true, });

		await extract({ platform, entry, targetDir, dataDir, html, });
	}
} finally {
	html.persistCache();
}
