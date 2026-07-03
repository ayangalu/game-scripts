import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { stdout } from "node:process";

import { input } from "@inquirer/prompts";
import { execa } from "execa";
import getPort from "get-port";
import { match } from "ts-pattern";
import waitOn from "wait-on";
import yoctoSpinner from "yocto-spinner";


const temp = path.join(import.meta.dirname, ".temp");
const $ = execa({ cwd: temp, stdout, });

export const exportPath = path.join(temp, "export");

const assetRipperVersion = "1.3.14";
const assetRipperPathRelative = path.posix.join("AssetRipper", assetRipperVersion);
const assetRipperPathAbsolute = path.join(temp, assetRipperPathRelative);

async function downloadAssetRipper() {
	try {
		await fs.rm(exportPath, { recursive: true, force: true, });

		await fs.mkdir(assetRipperPathAbsolute, { recursive: true, });

		const platform = match(os.platform())
			.with("linux", () => "linux")
			.with("win32", () => "win")
			.with("darwin", () => "mac")
			.run();

		const arch = match(os.arch())
			.with("x64", () => "x64")
			.with("arm64", () => "arm64")
			.run();

		const zipPathRelative = path.join(assetRipperPathRelative, "release.zip");
		const zipPathAbsolute = path.join(temp, zipPathRelative);

		const spinner = yoctoSpinner().start("Downloading AssetRipper ...");

		const response = await fetch(`https://github.com/AssetRipper/AssetRipper/releases/download/${assetRipperVersion}/AssetRipper_${platform}_${arch}.zip`);

		await fs.writeFile(zipPathAbsolute, await response.bytes());

		spinner.text = "Extracting ...";

		if (platform === "win") {
			await $`powershell -command Expand-Archive -Path ${zipPathRelative} -DestinationPath ${assetRipperPathRelative}`;
		} else {
			await $`unzip -d ${assetRipperPathRelative} ${zipPathRelative}`;
		}

		await fs.rm(zipPathAbsolute);

		spinner.success("Done!");
	} catch (error) {
		await fs.rm(assetRipperPathAbsolute, { recursive: true, force: true, });
		throw error;
	}
}

try {
	await fs.access(assetRipperPathAbsolute);
} catch {
	await downloadAssetRipper();
}

try {
	await fs.access(exportPath);
} catch {
	const dataPath = process.env["FF9_DATA_PATH"] ?? await input({
		message: `Please enter the absolute path to the data directory. This is usually <Steam folder>/steamapps/common/FINAL FANTASY IX/x64/FF9_Data/`,
		required: true,
		validate: async (value) => {
			try {
				await fs.access(value);
				return true;
			} catch {
				return false;
			}
		},
	});

	const port = await getPort();

	using ripper = $({ detached: true, })`./${assetRipperPathRelative}/AssetRipper.GUI.Free --port=${port} --headless`;

	await waitOn({
		resources: [ `tcp:localhost:${port}`, ],
		delay: 1000,
		timeout: 30_000,
	});

	await fetch(`http://localhost:${port}/LoadFolder`, {
		method: "POST",
		body: new URLSearchParams({
			"Path": dataPath,
		}),
	});

	await fetch(`http://localhost:${port}/Export/UnityProject`, {
		method: "POST",
		body: new URLSearchParams({
			"Path": exportPath,
		}),
	});
}
