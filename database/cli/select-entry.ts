import path from "node:path/posix";

import { search } from "@inquirer/prompts";
import { config } from 'dotenv';
import { glob } from "glob";

function displayEntry(entry: string) {
	return entry.split("/").slice(1, -1).join("/");
}

export async function selectEntry(type: string) {
	const games = await glob(`games/**/${type}.ts`, { posix: true });
	const choices = games.map((game) => {
		return {
			value: path.dirname(game),
			name: displayEntry(game),
		};
	})

	const result = await search({
		message: "Select a game",
		source: (input) => {
			if (!input) {
				return choices;
			}

			return choices.filter(({ name }) => name.includes(input));
		},
	});

	if (config({ path: path.join(result, ".env") }).error) {
		console.log(`No .env found for "${displayEntry(result)}"`);
	}

	return result;
}
