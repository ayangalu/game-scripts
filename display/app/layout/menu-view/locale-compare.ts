const defaultCollator = new Intl.Collator('en-US');

type CompareFunction<T> = (a: T, b: T) => number;

export type LocaleCompareSelector<T> = (item: T) => string;

export function localeCompare<T>(selector: LocaleCompareSelector<T>): CompareFunction<T>;
export function localeCompare(): CompareFunction<string>;
export function localeCompare<T>(selector?: LocaleCompareSelector<T>) {
	if (!selector) {
		return defaultCollator.compare;
	}

	return (a: T, b: T) => defaultCollator.compare(selector(a), selector(b));
}
