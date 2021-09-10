import { html, css, nothing, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { repeat } from 'lit/directives/repeat.js';

import type { GameInfo } from './game-scripts';
import type { NRecord, TargetEvent } from './types';

@customElement('message-table')
export class MessageTable extends LitElement {
	static styles = css`
		table {
			width: 100%;
			border-collapse: collapse;
		}

		td {
			padding: var(--sl-spacing-small);
			white-space: pre;
		}

		ruby {
			white-space: normal;
		}

		td.target {
			font-size: var(--sl-font-size-x-large);
		}

		td.source > div {
			cursor: pointer;
		}

		td.source > div.blurred {
			filter: blur(5px);
		}
	`;

	@property({ attribute: false })
	gameInfo?: GameInfo;

	@property({ attribute: false })
	data?: NRecord<string, string, 2>;

	@property({ attribute: false })
	locales: string[] = [];

	@property({ attribute: false })
	targetLocale?: string;

	private toggleBlur({ currentTarget }: TargetEvent<HTMLElement>) {
		currentTarget.classList.toggle('blurred');
	}

	private renderMessage(message?: string) {
		if (!message) {
			return nothing;
		}

		return unsafeHTML(message);
	}

	private renderMessages(messages: Record<string, string>) {
		if (this.targetLocale) {
			return html`
				<td lang=${this.targetLocale} class="target">${this.renderMessage(messages[this.targetLocale])}</td>
				${this.locales
					.filter((locale) => locale !== this.targetLocale)
					.map((locale) => {
						return html`
							<!-- prettier-ignore -->
							<td lang=${locale} class="source"><div class="blurred" @click=${this.toggleBlur}
								>${this.renderMessage(messages[locale])}</div
							></td>
						`;
					})}
			`;
		}

		return html`
			${this.locales.map((locale) => {
				return html` <td lang=${locale}>${this.renderMessage(messages[locale])}</td> `;
			})}
		`;
	}

	render() {
		if (!this.data || !this.locales.length) {
			return nothing;
		}

		return html`
			<link rel="stylesheet" href=${`${this.gameInfo?.root}/style.css`} />
			<table>
				${repeat(
					Object.entries(this.data).filter(([_, messages]) => {
						return Object.entries(messages).some(([locale, message]) => {
							return this.locales.includes(locale) && message;
						});
					}),
					([label]) => label,
					([label, messages]) => {
						return html`
							<tr id=${label}>
								<td>${label}</td>
								${this.renderMessages(messages)}
							</tr>
						`;
					},
				)}
			</table>
		`;
	}
}
