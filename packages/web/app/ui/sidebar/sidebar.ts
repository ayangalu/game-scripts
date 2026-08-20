import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import "./color-scheme-select.ts";

@customElement("gs-sidebar")
export class Sidebar extends LitElement {
	override render() {
		return html`
			<gs-color-scheme-select></gs-color-scheme-select>
		`;
	}
}
