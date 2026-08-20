import type WaIcon from "@awesome.me/webawesome/dist/components/icon/icon.js";
import type { IconLibraryMutator } from "@awesome.me/webawesome/dist/components/icon/library.js";
import { registerIconLibrary, setDefaultIconFamily } from "@awesome.me/webawesome";
import "@awesome.me/webawesome/dist/styles/webawesome.css";

import "./main.css";
import "./ui/app.ts";

const phosphorResolver = (name: string, family: string) => {
	if (family === "regular") {
		return `${import.meta.env.BASE_URL}icons/${family}/${name}.svg`;
	}

	return `${import.meta.env.BASE_URL}icons/${family}/${name}-${family}.svg`;
};

const phosphorMutator = ((svg: SVGElement, host: WaIcon) => {
	svg.style.setProperty("height", "1.25em");
	host.canvas = "square";
	host.style.setProperty("vertical-align", "unset");
}) as IconLibraryMutator;

setDefaultIconFamily("regular");

registerIconLibrary("default", {
	resolver: phosphorResolver,
	mutator: phosphorMutator,
});

registerIconLibrary("system", {
	resolver: (name, family) => {
		const nameMap: Record<string, string> = {
			"xmark": "x",
		};

		if (name in nameMap) {
			return phosphorResolver(nameMap[name]!, family);
		}

		console.debug(name);

		return "/404";
	},
	mutator: phosphorMutator,
});
