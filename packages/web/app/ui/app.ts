import "@awesome.me/webawesome/dist/components/button/button.js";
import "@awesome.me/webawesome/dist/components/icon/icon.js";
import "@awesome.me/webawesome/dist/components/page/page.js";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import "./sidebar/color-scheme-select.ts";

@customElement("gs-app")
export class App extends LitElement {
	static override readonly styles = css`
		wa-page[view="desktop"] [data-toggle-nav] {
			display: none;
		}
	`;

	override render() {
		return html`
			<wa-page mobile-breakpoint="1500">
				<div slot="navigation" class="wa-stack">
					<div class="wa-cluster">
						<gs-color-scheme-select></gs-color-scheme-select>
					</div>
				</div>
				<div slot="main-header">
					<wa-button data-toggle-nav appearance="plain" variant="neutral">
						<wa-icon name="list"></wa-icon>
					</wa-button>
				</div>
			</wa-page>
		`;
	}
}
