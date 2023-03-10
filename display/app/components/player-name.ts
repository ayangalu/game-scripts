import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('player-name')
export class PlayerName extends LitElement {
	private static characterRegistry = new Map<string, string | ReadonlyDict<string>>();
	private static elementRegistry = new Set<PlayerName>();

	static reset(info?: GameInfo) {
		PlayerName.characterRegistry.clear();

		if (info?.characters) {
			for (const [key, name] of Object.entries(info.characters)) {
				PlayerName.register(key, name);
			}
		}
	}

	static register(key: string, name: string | ReadonlyDict<string>) {
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

	private renderValue(value: string) {
		if (this.capitalize) {
			return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
		}

		return value;
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		PlayerName.elementRegistry.delete(this);
	}

	createRenderRoot() {
		return this;
	}

	render() {
		const name = PlayerName.characterRegistry.get(this.character);

		if (typeof name === 'string') {
			return this.renderValue(name);
		} else if (name) {
			const locale = this.closest<HTMLElement>('td[lang]')?.lang ?? '';
			return this.renderValue(name[locale] ?? name['*']);
		}
	}
}
