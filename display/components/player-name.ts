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
	declare character;

	private capitalize = false;

	constructor() {
		super();
		this.character = '';
		PlayerName.elementRegistry.add(this);

		if (this.parentElement?.classList.contains('capitalize')) {
			this.style.textTransform = 'none';
			this.capitalize = true;
		}
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		PlayerName.elementRegistry.delete(this);
	}

	render() {
		const name = PlayerName.characterRegistry.get(this.character);
		return html`${this.capitalize ? `${name?.charAt(0).toUpperCase()}${name?.slice(1)}` : name}`;
	}
}
