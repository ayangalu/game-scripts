import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parse } from "tashikame";

import { GameEntry } from "@game-scripts/schema/game-entry";
import { HtmlTools } from "@game-scripts/tools/html-tools.js";

import { selectEntry } from "./select-entry.js";

export type DumpArgs = {
	readonly platform: string;
	readonly entry: GameEntry;
	readonly targetDir: string;
	readonly dataDir: string;
	readonly html: HtmlTools;
}

export type DumpFunction = (args: DumpArgs) => void;

const gameRoot = await selectEntry("dump");
const html = new HtmlTools(gameRoot);
const { dump } = await import(`../${gameRoot}/dump.js`) as { dump: DumpFunction};

process.on("SIGINT", () => html.persistCache());
process.on("SIGQUIT", () => html.persistCache());
process.on("SIGTERM", () => html.persistCache());

try {
	for (const variant of await readdir(path.join(gameRoot, "meta"))) {
		const platform = path.parse(variant).name;
		const entry = parse(GameEntry, JSON.parse(await readFile(path.join(gameRoot, "meta", variant), "utf-8")));
		const targetDir = process.argv.includes("--prod") ? `../display/public/games/${entry.id}` : `${gameRoot}/.temp/${entry.id}`;
		const dataDir = `${targetDir}/data`;

		await mkdir(dataDir, { recursive: true });

		dump({ platform, entry, targetDir, dataDir, html });
	}
} finally {
	html.persistCache();
}
