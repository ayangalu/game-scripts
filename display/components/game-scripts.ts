import type { SlInput, SlMenuItem, SlSelect } from '@shoelace-style/shoelace';
import { css, html, nothing, LitElement } from 'lit';
import { customElement, query, queryAll, state } from 'lit/decorators.js';
import { until } from 'lit/directives/until.js';
import { SearchIndexLocation } from '../types';

import SearchWorker from '../worker/search?worker';

import type { MessageTable } from './message-table';
import type { NRecord, TargetEvent } from './types';
import { PlayerName } from './player-name';
import { KoreanJosa } from './ko-josa';

export interface GameInfo {
	root: string;
	locales: string[];
	characters?: Record<string, string>;
	data?: NRecord<string, string, 4>;
	search?: Worker;
	indexed?: Promise<void>;
}

@customElement('game-scripts')
export class GameScripts extends LitElement {
	static styles = css`
		:host {
			--border-color: 1px solid rgb(var(--sl-color-gray-400));

			font-family: var(--sl-font-sans);
			width: 100vw;
			height: 100vh;
			display: grid;
			grid:
				'header header' auto
				'sidebar content' 1fr
				/ minmax(250px, auto) 1fr;
		}

		header {
			grid-area: header;
			display: grid;
			grid:
				'game locales target' auto
				'search search search' auto
				/ 1fr 1fr 1fr;
			gap: var(--sl-spacing-small);
			padding: var(--sl-spacing-medium);
			border-bottom: var(--border-color);
		}

		header > .search {
			grid-area: search;
		}

		aside {
			grid-area: sidebar;
			overflow-y: auto;
			border-right: var(--border-color);
		}

		main {
			grid-area: content;
			padding: var(--sl-spacing-medium);
			overflow: auto;
		}
	`;

	@queryAll('sl-menu-item')
	private menuItems?: NodeList<SlMenuItem>;

	@query('message-table')
	private messageTable?: MessageTable;

	@state()
	games: Record<string, GameInfo> = {};

	@state()
	selectedGame?: GameInfo;

	@state()
	selectedMessages?: NRecord<string, string, 2>;

	@state()
	selectedLocales: string[] = [];

	@state()
	selectedTargetLocale?: string;

	@state()
	searchResult?: Promise<SearchIndexLocation[]>;

	@state()
	searchIndex = 0;

	constructor() {
		super();

		this.fetchJson<Record<string, GameInfo>>('games.json').then((data) => {
			this.games = data;
		});
	}

	private fetchJson<T>(src: string) {
		return fetch(src).then((response) => response.json()) as Promise<T>;
	}

	private onGameSelect({ currentTarget }: TargetEvent<SlSelect>) {
		if (typeof currentTarget.value !== 'string') {
			throw new Error();
		}

		const gameName = currentTarget.value;
		this.selectedGame = this.games[gameName];

		Object.entries(this.selectedGame.characters ?? {}).forEach(([key, name]) => PlayerName.register(key, name));
		KoreanJosa.update();

		if (!this.games[gameName].data) {
			this.fetchJson<NRecord<string, string, 4>>(`${this.selectedGame.root}/message.json`).then((data) => {
				const worker = new SearchWorker();
				worker.postMessage(data);
				this.games[gameName].data = data;
				this.games[gameName].search = worker;
				this.games[gameName].indexed = new Promise((resolve) => {
					const handleIndexed = (event: MessageEvent) => {
						if (event.data === 'indexed') {
							worker.removeEventListener('message', handleIndexed);
							resolve();
						}
					};
					worker.addEventListener('message', handleIndexed);
				});
				this.requestUpdate();
			});
		}
	}

	private onLocaleSelect({ currentTarget }: TargetEvent<SlSelect>) {
		if (typeof currentTarget.value === 'string') {
			throw new Error();
		}

		this.selectedLocales = [...currentTarget.value];
	}

	private onTargetSelect({ currentTarget }: TargetEvent<SlSelect>) {
		if (typeof currentTarget.value !== 'string') {
			throw new Error();
		}

		this.selectedTargetLocale = currentTarget.value;
	}

	private search(targetEvent: TargetEvent<SlInput, InputEvent | CompositionEvent>) {
		if (targetEvent instanceof InputEvent && targetEvent.isComposing) {
			return;
		}

		const { currentTarget } = targetEvent;

		if (!currentTarget.value) {
			this.searchResult = Promise.resolve([]);
			requestAnimationFrame(() => currentTarget.focus());
			return;
		}

		this.selectedGame?.search?.postMessage(currentTarget.value);
		this.searchResult = new Promise((resolve, reject) => {
			const searchHandler = (event: MessageEvent) => {
				requestAnimationFrame(() => currentTarget.focus());
				this.selectedGame?.search?.removeEventListener('message', searchHandler);
				if (Array.isArray(event.data)) {
					// @ts-expect-error
					const locations: SearchIndexLocation[] = event.data.filter(({ locale }: SearchIndexLocation) =>
						this.selectedLocales?.includes(locale),
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
			this.selectedGame?.search?.addEventListener('message', searchHandler);
		});
	}

	private load(location: SearchIndexLocation) {
		this.selectedMessages = this.selectedGame?.data?.[location.group][location.file];
		this.menuItems?.forEach((item) => (item.checked = item.value === location.file));
		requestAnimationFrame(() => {
			const row = `#${CSS.escape(location.label)}`;
			this.messageTable?.shadowRoot?.querySelector(row)?.scrollIntoView();
		});
	}

	private stepSearchResult(direction: 1 | -1) {
		return async () => {
			const locations = (await this.searchResult) ?? [];
			const { length } = locations;
			this.searchIndex = (((this.searchIndex + direction) % length) + length) % length;
			this.load(locations[this.searchIndex]);
		};
	}

	private renderHeader() {
		const gameList = Object.keys(this.games);

		return html`
			<sl-select @sl-change=${this.onGameSelect} label="Game" placeholder="Select game" .disabled=${!gameList.length}>
				${gameList.map((name) => {
					return html`<sl-menu-item .value=${name}>${name}</sl-menu-item>`;
				})}
			</sl-select>

			<sl-select
				@sl-blur=${this.onLocaleSelect}
				@sl-clear=${this.onLocaleSelect}
				label="Locales"
				placeholder="Select locales"
				.disabled=${!this.selectedGame}
				multiple
			>
				${this.selectedGame?.locales.map((locale) => {
					return html`<sl-menu-item .value=${locale}>${locale}</sl-menu-item>`;
				})}
			</sl-select>

			<sl-select
				@sl-change=${this.onTargetSelect}
				label="Target locale"
				placeholder="Select target locale"
				.disabled=${!this.selectedLocales.length}
				clearable
			>
				${this.selectedLocales.map((locale) => {
					return html`<sl-menu-item .value=${locale}>${locale}</sl-menu-item>`;
				})}
			</sl-select>

			<sl-input
				@input=${this.search}
				@compositionend=${this.search}
				class="search"
				label="Search"
				placeholder=${until(this.selectedGame?.indexed?.then(() => '') ?? '', 'indexing')}
				help-text=${until(
					this.searchResult?.then((locations) => {
						if (locations.length === 0) {
							return `No results`;
						}

						const { group, file, label } = locations[this.searchIndex];
						return `Search results: ${this.searchIndex + 1} / ${locations.length} @ ${group}/${file}/${label}`;
					}) ?? '\xa0',
					'\xa0',
				)}
				.disabled=${until(this.selectedGame?.indexed?.then(() => false) ?? true, true)}
			>
				${until(
					this.selectedGame?.indexed?.then(() => html`<sl-icon name="search" slot="prefix"></sl-icon>`) ?? nothing,
					html`<sl-spinner slot="prefix"></sl-spinner>`,
				)}
				<div slot="suffix">
					<sl-button
						@click=${this.stepSearchResult(-1)}
						type="default"
						size="small"
						.disabled=${until(this.searchResult?.then(({ length }) => !length) ?? true, true)}
						circle
						><sl-icon name="caret-left-fill"></sl-icon
					></sl-button>
					<sl-button
						@click=${this.stepSearchResult(1)}
						type="default"
						size="small"
						.disabled=${until(this.searchResult?.then(({ length }) => !length) ?? true, true)}
						circle
						><sl-icon name="caret-right-fill"></sl-icon
					></sl-button>
				</div>
			</sl-input>
		`;
	}

	private renderSidebar() {
		if (!this.selectedGame) {
			return nothing;
		}

		if (!this.selectedGame.data) {
			return html`<sl-spinner></sl-spinner>`;
		}

		const data = this.selectedGame.data;

		return html`
			<sl-menu>
				${Object.keys(data).map((group) => {
					return html`
						${group ? html`<sl-menu-label>${group}</sl-menu-label>` : nothing}
						${Object.keys(data[group]).map((option) => {
							return html`
								<sl-menu-item
									@click=${({ currentTarget }: TargetEvent<SlMenuItem>) => {
										this.selectedMessages = data[group][option];
										this.menuItems?.forEach((item) => (item.checked = false));
										currentTarget.checked = true;
									}}
									value=${option}
									>${option}</sl-menu-item
								>
							`;
						})}
					`;
				})}
			</sl-menu>
		`;
	}

	render() {
		return html`
			<header>${this.renderHeader()}</header>
			<aside>${this.renderSidebar()}</aside>
			<main>
				<message-table
					.gameInfo=${this.selectedGame}
					.data=${this.selectedMessages}
					.locales=${this.selectedLocales}
					.targetLocale=${this.selectedTargetLocale}
				></message-table>
			</main>
		`;
	}
}
