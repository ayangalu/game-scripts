import { html, nothing, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { when } from 'lit/directives/when.js';
import { map } from 'rxjs';
import { combineLatest } from 'rxjs';

import { subscribe } from '~/decorators/subscribe';
import { gameData$ } from '~/state/game-data';
import { focusedLocale$, selectedAvailableLocales$ } from '~/state/locale';
import { path$ } from '~/state/path';

const messages$ = combineLatest([path$, gameData$]).pipe(
	map(([path, gameData]) => {
		if (!gameData) {
			return {};
		}

		let { data } = gameData;

		// skip platform and game title
		for (const { label } of path.slice(2)) {
			data = data[label] as MessageData;

			if (!data) {
				return {};
			}
		}

		return data as unknown as MessageDict;
	}),
);

const locales$ = combineLatest([selectedAvailableLocales$, focusedLocale$]).pipe(
	map(([selectedLocales, focusedLocale]) => {
		return [...selectedLocales].sort((a, b) => {
			switch (focusedLocale) {
				case a:
					return -1;
				case b:
					return 1;
			}

			return 0;
		});
	}),
);

@customElement('gs-message-table')
export class MessageTable extends LitElement {
	@subscribe(messages$, {})
	declare readonly messages: MessageDict;

	@subscribe(locales$, [])
	declare readonly selectedLocales: readonly string[];

	@subscribe(focusedLocale$)
	declare readonly focusedLocale: string | null;

	private readonly resize = new ResizeObserver(([entry]) => {
		const parentHeight = this.parentElement?.clientHeight ?? 0;

		const table = this.querySelector('table');

		if (entry.contentRect.height > parentHeight) {
			table?.classList.add('no-bottom');
		} else {
			table?.classList.remove('no-bottom');
		}
	});

	private renderMessage(message?: string) {
		if (!message) {
			return nothing;
		}

		return unsafeHTML(message);
	}

	connectedCallback() {
		super.connectedCallback();
		this.resize.observe(this);
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this.resize.disconnect();
	}

	createRenderRoot() {
		return this;
	}

	updated() {
		const lineHeights: Record<string, number> = {};

		for (const cell of this.renderRoot.querySelector('tr')?.querySelectorAll<HTMLElement>('td[lang]') ?? []) {
			const locale = new Intl.Locale(cell.lang);
			const span = cell.appendChild(document.createElement('span'));

			span.textContent = (() => {
				switch (locale.language) {
					case 'ja':
						return 'あ';
					case 'ko':
						return '해';
					case 'zh':
						return '中';
					default:
						return 'A';
				}
			})();

			lineHeights[cell.lang] = span.getBoundingClientRect().height;

			cell.removeChild(span);
		}

		for (const cell of this.renderRoot.querySelectorAll<HTMLElement>('td[lang]')) {
			cell.style.setProperty('--inline-height', `${lineHeights[cell.lang]}px`);
		}
	}

	render() {
		if (this.selectedLocales.length === 0) {
			this.parentElement?.classList.add('no-data');

			return html`
				<sl-alert open>
					<sl-icon slot="icon" name="info-circle"></sl-icon>
					Select a locale
				</sl-alert>
			`;
		}

		this.parentElement?.classList.remove('no-data');

		const entries = Object.entries(this.messages).filter(([_, messageList]) => {
			return Object.entries(messageList).some(([locale, value]) => {
				return this.selectedLocales.includes(locale) && value;
			});
		});

		return html`
			<table>
				${repeat(
					entries,
					([key]) => key,
					([key, message]) => {
						return html`
							<tr id=${`row-${key}`}>
								${when(!Array.isArray(this.messages), () => html`<td>${key}</td>`)}
								${when(
									this.focusedLocale,
									() =>
										this.selectedLocales.map((locale) => {
											return html`
												<td
													lang=${locale}
													class=${classMap({
														focus: locale === this.focusedLocale,
														dim: locale !== this.focusedLocale,
													})}
												>
													${when(
														locale === this.focusedLocale,
														() => html`<pre>${this.renderMessage(message[locale])}</pre>`,
														() => html`
															<pre
																class="blur"
																@click=${(event: TargetEvent<HTMLElement>) => {
																	event.currentTarget.classList.toggle('blur');
																}}
															>
${this.renderMessage(message[locale])}</pre
															>
														`,
													)}
												</td>
											`;
										}),
									() =>
										this.selectedLocales.map((locale) => {
											return html`<td lang=${locale}><pre>${this.renderMessage(message[locale])}</pre></td>`;
										}),
								)}
							</tr>
						`;
					},
				)}
			</table>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'gs-message-table': MessageTable;
	}
}
