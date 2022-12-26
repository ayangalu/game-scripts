import type { SlSelectSingle } from '@shoelace-style/shoelace';
import type { ObservedValueOf } from 'rxjs';
import { css, html, LitElement } from 'lit';
import { customElement, query } from 'lit/decorators.js';

import { subscribe } from '~/decorators/subscribe';
import { localeService } from '~/services/locale';
import { focusedLocale$, selectedAvailableLocales$ } from '~/state/locale';

@customElement('gs-focus-select')
export class FocusSelect extends LitElement {
	static styles = css`
		:host {
			flex-basis: 15em;
		}
	`;

	@subscribe(selectedAvailableLocales$, [])
	declare readonly selectedLocales: ObservedValueOf<typeof selectedAvailableLocales$>;

	@query('sl-select')
	declare readonly select: SlSelectSingle;

	render() {
		return html`
			<sl-mutation-observer
				child-list
				@sl-mutation=${() => {
					if (!this.selectedLocales.includes(this.select.value)) {
						this.select.value = '';
					}
				}}
			>
				<sl-select
					label="Focus"
					clearable
					.value=${focusedLocale$.value ?? ''}
					.disabled=${this.selectedLocales.length === 0}
					@sl-change=${(event: TargetEvent<SlSelectSingle>) => {
						focusedLocale$.next(event.currentTarget.value || null);
					}}
				>
					${this.selectedLocales.map(
						(locale) => html`<sl-menu-item value=${locale}>${localeService.format(locale)}</sl-menu-item>`,
					)}
				</sl-select>
			</sl-mutation-observer>
		`;
	}
}
