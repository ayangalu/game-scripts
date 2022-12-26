import type { ZodType } from 'zod';
import { BehaviorSubject } from 'rxjs';

export interface PersistStateConfig<T> {
	readonly initialValue: T;
	readonly key: string;
	readonly schema?: ZodType<T>;
	readonly onUpdate?: (value: T) => void;
}

const registeredKeys = new Set<string>();

export function persist<T>({ initialValue, key, schema, onUpdate }: PersistStateConfig<T>): BehaviorSubject<T> {
	if (registeredKeys.has(key)) {
		throw new Error(`persistence key '${key}' already in use`);
	}

	let value = initialValue;

	const raw = localStorage.getItem(key);

	if (raw) {
		try {
			const data = JSON.parse(raw);
			value = schema?.parse(data) ?? data;
		} catch {
			const alert = Object.assign(document.createElement('sl-alert'), {
				variant: 'warning',
				closable: true,
				duration: 3000,
				innerHTML: `
					<sl-icon name="exclamation-triangle" slot="icon"></sl-icon>
					Invalid data for local storage item <code>${key}</code>!
				`,
			});

			document.body.appendChild(alert);
			alert.toast();
		}
	}

	onUpdate?.(value);

	const source$ = new BehaviorSubject(value);

	source$.subscribe((nextValue) => {
		localStorage.setItem(key, JSON.stringify(nextValue));
		onUpdate?.(nextValue);
	});

	return source$;
}
