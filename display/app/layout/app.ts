import type { ObservedValueOf } from 'rxjs';
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';

import { subscribe } from '~/decorators/subscribe';
import { gameData$ } from '~/state/game-data';
import { selectedLocales$ } from '~/state/locale';

import './header/focus-select';
import './header/locales-select';
import './header/path';
import './header/ruby-toggle';
import './header/search-bar';
import './menu';
import './message-table';

@customElement('gs-app')
export class App extends LitElement {
	@subscribe(gameData$)
	declare readonly gameData: ObservedValueOf<typeof gameData$>;

	@subscribe(selectedLocales$)
	declare readonly selectedLocales: ObservedValueOf<typeof selectedLocales$>;

	createRenderRoot() {
		return this;
	}

	render() {
		return html`
			<aside>
				<gs-menu></gs-menu>
			</aside>
			${when(
				this.gameData,
				// () => html`
				// 	<link rel="stylesheet" href=${`${this.gameData?.info.root}/style.css`} />
				// 	<header>
				// 		<gs-path></gs-path>
				// 		<gs-locales-select></gs-locales-select>
				// 		<div class="focus-search-container">
				// 			<gs-focus-select></gs-focus-select>
				// 			${when(
				// 				this.gameData?.info.ruby?.some((locale) => this.selectedLocales.includes(locale)),
				// 				() => html`<gs-ruby-toggle></gs-ruby-toggle>`,
				// 			)}
				// 			<gs-search-bar></gs-search-bar>
				// 		</div>
				// 	</header>
				// 	<main>
				// 		<gs-message-table></gs-message-table>
				// 	</main>
				// `,
				() => html`
					<main class="no-data">
						<sl-alert open>
							<sl-icon slot="icon" name="info-circle"></sl-icon>
							Select a game
						</sl-alert>
					</main>
				`,
				() => html`
					<main class="no-data">
						<sl-alert open>
							<sl-icon slot="icon" name="info-circle"></sl-icon>
							Select a game
						</sl-alert>
					</main>
				`,
			)}
		`;
	}
}
