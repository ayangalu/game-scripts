import type { SlSelectSingle } from '@shoelace-style/shoelace';
import type { ObservedValueOf } from 'rxjs';
import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

import { showRuby$ } from '~/state/show-ruby';

@customElement('gs-ruby-toggle')
export class RubyToggle extends LitElement {
	static styles = css`
		:host {
			flex-basis: 8em;
		}
	`;

	render() {
		return html`
			<sl-select
				label="Ruby text"
				.value=${showRuby$.value}
				@sl-change=${(event: TargetEvent<SlSelectSingle<ObservedValueOf<typeof showRuby$>>>) => {
					showRuby$.next(event.currentTarget.value);
				}}
			>
				<sl-menu-item value="toggle">Toggle</sl-menu-item>
				<sl-menu-item value="hide">Hide</sl-menu-item>
				<sl-menu-item value="show">Show</sl-menu-item>
			</sl-select>
		`;
	}
}
