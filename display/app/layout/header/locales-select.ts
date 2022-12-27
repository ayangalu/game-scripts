import type { SlCheckbox } from '@shoelace-style/shoelace';
import type { ObservedValueOf } from 'rxjs';
import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

import { subscribe } from '~/decorators/subscribe';
import { localeService } from '~/services/locale';
import { gameData$ } from '~/state/game-data';
import { selectedLocales$ } from '~/state/locale';

@customElement('gs-locales-select')
export class LocalesSelect extends LitElement {
	static styles = css`
		:host {
			display: flex;
			flex-wrap: wrap;
			gap: var(--sl-spacing-medium);
		}
	`;

	@subscribe(gameData$)
	declare readonly gameData: ObservedValueOf<typeof gameData$>;

	render() {
		return html`
			${this.gameData?.info.locales.map(
				(locale) =>
					html`
						<sl-checkbox
							.checked=${selectedLocales$.value.includes(locale)}
							@click=${(event: TargetEvent<SlCheckbox>) => {
								const current = new Set(selectedLocales$.value);

								if (event.currentTarget.checked) {
									current.add(locale);
								} else {
									current.delete(locale);
								}

								selectedLocales$.next([...current]);
							}}
						>
							${localeService.format(locale)}</sl-checkbox
						>
					`,
			)}
		`;
	}
}
