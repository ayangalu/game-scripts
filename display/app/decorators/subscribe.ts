import type { Observable, Subscription } from 'rxjs';
import { state } from 'lit/decorators.js';

export function subscribe<T>(observable$: Observable<T>, initialValue: T): PropertyDecorator;
export function subscribe<T>(observable$: Observable<T> & { readonly value: T }): PropertyDecorator;
export function subscribe<T>(
	observable$: Observable<T> & { readonly value?: T },
	initialValue = 'value' in observable$ ? observable$.value : undefined,
): PropertyDecorator {
	return (target: any, name: PropertyKey) => {
		const onConnected: Function = target.connectedCallback;
		const onDisconnected: Function = target.disconnectedCallback;
		const litInit: Function = target._initialize;

		let subscription: Subscription;

		target._initialize = function () {
			litInit.call(this);
			this[name] = initialValue;
		};

		target.connectedCallback = function () {
			onConnected.call(this);
			subscription = observable$.subscribe({
				next: (nextValue) => {
					this[name] = nextValue;
				},
			});
		};

		target.disconnectedCallback = function () {
			onDisconnected.call(this);
			subscription.unsubscribe();
		};

		return state()(target, name);
	};
}
