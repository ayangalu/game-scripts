import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('player-name')
export class PlayerName extends LitElement {
	private static characterRegistry = new Map<string, string>();
	private static elementRegistry = new Set<PlayerName>();

	static register(key: string, name: string) {
		PlayerName.characterRegistry.set(key, name);
		[...this.elementRegistry].filter(({ character }) => character === key).forEach((element) => element.requestUpdate());
	}

	@property()
	character = '';

	constructor() {
		super();
		PlayerName.elementRegistry.add(this);
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		PlayerName.elementRegistry.delete(this);
	}

	render() {
		return html`${PlayerName.characterRegistry.get(this.character)}`;
	}
}
