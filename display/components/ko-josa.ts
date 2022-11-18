import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('ko-josa')
export class KoreanJosa extends LitElement {
	private static elementRegistry = new Set<KoreanJosa>();

	static update() {
		this.elementRegistry.forEach((element) => element.requestUpdate());
	}

	@property()
	declare moeum;

	@property()
	declare batchim;

	constructor() {
		super();
		this.moeum = '';
		this.batchim = '';
		KoreanJosa.elementRegistry.add(this);
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		KoreanJosa.elementRegistry.delete(this);
	}

	render() {
		const previous: (Node & { shadowRoot?: ShadowRoot }) | null = this.previousSibling;
		const text = previous?.shadowRoot?.textContent ?? previous?.textContent ?? '';

		// https://github.com/simnalamburt/npm/blob/master/packages/hangul-josa/src/index.ts
		const jong = ((text.slice(-1).codePointAt(0) ?? 0) - 0xac00) % 28;

		let variant = this.moeum;

		if (jong > 0) {
			if (this.batchim === '으로') {
				if (jong !== 8) {
					variant = this.batchim;
				}
			} else {
				variant = this.batchim;
			}
		}

		return html`${variant}`;
	}
}
