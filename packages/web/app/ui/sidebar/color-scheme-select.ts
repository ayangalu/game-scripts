import "@awesome.me/webawesome/dist/components/button/button.js";
import "@awesome.me/webawesome/dist/components/icon/icon.js";
import "@awesome.me/webawesome/dist/components/tooltip/tooltip.js";
import { literal, union, validate, type Infer } from "@tao/tashikame";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { map } from "lit/directives/map.js";
import { when } from "lit/directives/when.js";

import { MediaQueryController } from "#/app/controllers/media-query.ts";

const ColorScheme = union([ literal("system"), literal("light"), literal("dark"), ]);
type ColorScheme = Infer<typeof ColorScheme>;

const storageKey = "gs-color-scheme";
const savedColorScheme = validate.fallback(ColorScheme, localStorage.getItem(storageKey), "system");
const prefersDarkQuery = matchMedia("(prefers-color-scheme: dark)");

function applyScheme(scheme: ColorScheme, prefersDark: boolean) {
	if (scheme === "system") {
		document.documentElement.style.setProperty("color-scheme", "light dark");
	} else {
		document.documentElement.style.setProperty("color-scheme", scheme);
		prefersDark = scheme === "dark";
	}

	document.documentElement.classList.toggle("wa-dark", prefersDark);
	document.documentElement.classList.toggle("wa-light", !prefersDark);
}

applyScheme(savedColorScheme, prefersDarkQuery.matches);

@customElement("gs-color-scheme-select")
export class ColorSchemeSelect extends LitElement {
	static override styles = css`
		:host {
			display: flex;
			gap: var(--wa-space-2xs);
		}

		.container {
			position: relative;
		}

		.badge {
			font-size: 0.7em;
			border-radius: 50%;
			display: grid;
			place-content: center;
			padding: 0.2em;
			background-color: light-dark(
				rgb(from var(--gs-color-grey-80) r g b / 0.8),
				rgb(from var(--gs-color-grey-50) r g b / 0.8)
			);
			position: absolute;
			right: 0;
			bottom: 0;
			translate: 0.3em 0.3em;
		}
	`;

	@state()
	currentColorScheme = savedColorScheme;

	readonly prefersDark = new MediaQueryController(this, prefersDarkQuery, (event) => {
		if (this.currentColorScheme === "system") {
			applyScheme("system", event.matches);
		}
	});

	override render() {
		const options = [ {
			scheme: "light" as ColorScheme,
			label: "Light",
			icon: "sun",
			active: this.currentColorScheme === "light",
			system: !this.prefersDark.matches,
		}, {
			scheme: "dark" as ColorScheme,
			label: "Dark",
			icon: "moon",
			active: this.currentColorScheme === "dark",
			system: this.prefersDark.matches,
		}, ];

		return map(options, ({ scheme, label, icon, active, system, }) => html`
			<div class="container">
				<wa-tooltip for=${scheme}>${label}</wa-tooltip>
				<wa-button id=${scheme} pill variant=${when(active, () => "brand", () => "neutral")} appearance=${when(active, () => "filled-outlined", () => "outlined")} @click=${() => {
					if (this.currentColorScheme === scheme) {
						this.currentColorScheme = "system";
					} else {
						this.currentColorScheme = scheme;
					}

					localStorage.setItem(storageKey, this.currentColorScheme);
					applyScheme(this.currentColorScheme, this.prefersDark.matches);
				}}>
					<wa-icon name=${icon}></wa-icon>
				</wa-button>
				${when(active || system, () => html`
					<div class="badge">
						<wa-icon name=${when(active, () => "user", () => "gear-six")}></wa-icon>
					</div>
				`)}
			</div>
		`);
	}
}
