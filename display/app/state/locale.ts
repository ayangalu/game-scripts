import { combineLatest, map } from 'rxjs';
import { z } from 'zod';

import { gameData$ } from './game-data';
import { persist } from './persist';

export const selectedLocales$ = persist<readonly string[]>({
	initialValue: [],
	key: 'selectedLocales',
	schema: z
		.string()
		.array()
		.refine((value) => value.length === new Set(value).size),
});

export const selectedAvailableLocales$ = combineLatest([gameData$, selectedLocales$]).pipe(
	map(([gameData, selectedLocales]) => {
		if (!gameData) {
			return [];
		}

		return gameData.info.locales.filter((locale) => selectedLocales.includes(locale)) as readonly string[];
	}),
);

export const focusedLocale$ = persist<string | null>({
	initialValue: null,
	key: 'focusedLocale',
	schema: z.string().nullable(),
});
