import type { SlInput } from '@shoelace-style/shoelace';
import type { ObservedValueOf } from 'rxjs';
import { css, html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { until } from 'lit/directives/until.js';

import { subscribe } from '~/decorators/subscribe';
import { localeService } from '~/services/locale';
import { gameData$ } from '~/state/game-data';
import { selectedLocales$ } from '~/state/locale';
import { path$ } from '~/state/path';

@customElement('gs-search-bar')
export class SearchBar extends LitElement {
	static styles = css`
		:host {
			flex: 1;
		}

		sl-spinner {
			--track-color: var(--slategrey-darker-1);
			--indicator-color: var(--sl-color-primary-700);
		}
	`;

	@subscribe(gameData$)
	declare readonly gameData: NonNullable<ObservedValueOf<typeof gameData$>>;

	@state()
	declare searchResult?: Promise<readonly SearchIndexLocation[]>;

	@state()
	declare searchIndex;

	constructor() {
		super();
		this.searchIndex = 0;
	}

	private load(location: SearchIndexLocation) {
		document
			.querySelector('gs-menu')
			?.selectPath([...path$.value.slice(0, 2).map(({ label }) => label), ...location.path]);

		document.querySelectorAll('tr')[location.key]?.scrollIntoView();
	}

	private search(targetEvent: TargetEvent<SlInput, InputEvent | CompositionEvent>) {
		if (targetEvent instanceof InputEvent && targetEvent.isComposing) {
			return;
		}

		const { currentTarget } = targetEvent;

		if (!currentTarget.value) {
			this.searchResult = undefined;
			requestAnimationFrame(() => currentTarget.focus());
			return;
		}

		this.gameData.search?.postMessage(currentTarget.value);

		this.searchResult = new Promise((resolve, reject) => {
			const searchHandler = (event: MessageEvent) => {
				requestAnimationFrame(() => currentTarget.focus());

				this.gameData.search?.removeEventListener('message', searchHandler);

				if (Array.isArray(event.data)) {
					const locations: SearchIndexLocation[] = event.data.filter(({ locale }: SearchIndexLocation) =>
						selectedLocales$.value.includes(locale),
					);

					this.searchIndex = 0;

					if (locations.length) {
						this.load(locations[0]);
					}

					resolve(locations);
				} else {
					reject();
				}
			};

			this.gameData.search?.addEventListener('message', searchHandler);
		});
	}

	private stepSearchResult(direction: 1 | -1): () => Promise<void> {
		return async () => {
			const locations = (await this.searchResult) ?? [];
			const { length } = locations;
			this.searchIndex = (((this.searchIndex + direction) % length) + length) % length;
			this.load(locations[this.searchIndex]);
		};
	}

	render() {
		return html`
			<sl-input
				label="Search"
				placeholder=${until(
					this.gameData.indexed.then(() => ''),
					'indexing',
				)}
				.disabled=${until(
					this.gameData.indexed.then(() => false),
					true,
				)}
				help-text=${until(
					this.searchResult?.then((locations) => {
						if (locations.length === 0) {
							return `No results`;
						}

						const location = locations[this.searchIndex];
						return `Search results: ${this.searchIndex + 1} / ${locations.length} — ${location.path.join(
							'/',
						)} — ${localeService.format(location.locale)}`;
					}) ?? '\xa0',
					'\xa0',
				)}
				@input=${this.search}
				@compositionend=${this.search}
			>
				${until(
					this.gameData.indexed.then(() => html`<sl-icon name="search" slot="prefix"></sl-icon>`),
					html`<sl-spinner slot="prefix"></sl-spinner>`,
				)}
				<div slot="suffix">
					<sl-button
						@click=${this.stepSearchResult(-1)}
						variant="default"
						size="small"
						.disabled=${until(this.searchResult?.then(({ length }) => !length) ?? true, true)}
						circle
						><sl-icon name="caret-left-fill"></sl-icon
					></sl-button>
					<sl-button
						@click=${this.stepSearchResult(1)}
						variant="default"
						size="small"
						.disabled=${until(this.searchResult?.then(({ length }) => !length) ?? true, true)}
						circle
						><sl-icon name="caret-right-fill"></sl-icon
					></sl-button>
				</div>
			</sl-input>
		`;
	}
}
