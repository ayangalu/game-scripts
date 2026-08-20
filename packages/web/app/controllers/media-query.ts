import type { ReactiveController, ReactiveControllerHost } from "lit";

export type OnChangeCallback = (event: MediaQueryListEvent) => void;

export class MediaQueryController implements ReactiveController {
	readonly #host: ReactiveControllerHost;
	readonly #query: MediaQueryList;
	readonly #onchange: OnChangeCallback | undefined;

	readonly #listener = (event: MediaQueryListEvent) => {
		this.#matches = event.matches;
		this.#onchange?.(event);
		this.#host.requestUpdate();
	};

	#matches: boolean;
	get matches(): boolean {
		return this.#matches;
	}

	constructor(host: ReactiveControllerHost, query: MediaQueryList, onchange?: OnChangeCallback) {
		this.#host = host;
		this.#query = query;
		this.#matches = query.matches;
		this.#onchange = onchange;
		host.addController(this);
	}

	hostConnected(): void {
		this.#query.addEventListener("change", this.#listener);
	}

	hostDisconnected(): void {
		this.#query.removeEventListener("change", this.#listener);
	}
}
