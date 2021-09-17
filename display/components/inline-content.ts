import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

declare global {
	const ResizeObserver: any;
}

@customElement('inline-content')
export class InlineContent extends LitElement {
	private static resize = new ResizeObserver((entries: { target: HTMLElement }[]) => {
		for (const { target } of entries) {
			InlineContent.updateLineHeight(target);
		}
	});

	private static updateLineHeight(element: HTMLElement) {
		const span = element.appendChild(document.createElement('span'));
		span.textContent = 'A';
		element.style.setProperty('--line-height', `${span.getBoundingClientRect().height}px`);
		element.removeChild(span);
	}

	connectedCallback() {
		if (this.parentElement instanceof HTMLElement) {
			InlineContent.resize.observe(this.parentElement);
		}
	}

	disconnectedCallback() {
		if (this.parentElement instanceof HTMLElement) {
			InlineContent.resize.unobserve(this.parentElement);
		}
	}

	render() {
		return html`<slot></slot>`;
	}
}
