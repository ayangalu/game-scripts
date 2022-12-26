import type { ObservedValueOf } from 'rxjs';
import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

import { subscribe } from '~/decorators/subscribe';
import { path$ } from '~/state/path';

@customElement('gs-path')
export class Path extends LitElement {
	static styles = css`
		sl-breadcrumb-item::part(label) {
			color: var(--sl-color-primary-600);
		}

		sl-breadcrumb-item::part(label):not(:active):hover {
			color: var(--sl-color-primary-500);
		}
	`;

	@subscribe(path$)
	declare readonly path: ObservedValueOf<typeof path$>;

	render() {
		return html`
			<sl-breadcrumb>
				${this.path.map(({ item, label }) => {
					return html`
						<sl-breadcrumb-item
							@click=${async () => {
								for (const parent of this.path) {
									if (parent.item === item) {
										break;
									}

									if (!parent.item.expanded) {
										parent.item.expanded = true;
										await new Promise<void>((resolve) => {
											parent.item.addEventListener('sl-after-expand', () => resolve(), { once: true });
										});
									}
								}

								item.scrollIntoView({ behavior: 'smooth' });
							}}
						>
							${label}
						</sl-breadcrumb-item>
					`;
				})}
			</sl-breadcrumb>
		`;
	}
}
