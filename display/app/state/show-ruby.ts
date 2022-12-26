import { z } from 'zod';

import { focusedLocale$ } from './locale';
import { persist } from './persist';

const schema = z.union([z.literal('toggle'), z.literal('show'), z.literal('hide')]);

const toggleHandler = (event: Event) => {
	if (!(event.target instanceof HTMLElement)) {
		return;
	}

	if (focusedLocale$.value && event.target.closest<HTMLElement>('td[lang]')?.lang !== focusedLocale$.value) {
		return;
	}

	if (event.target.tagName === 'RT') {
		event.target.classList.toggle('show');
	}
};

export const showRuby$ = persist<z.infer<typeof schema>>({
	initialValue: 'toggle',
	key: 'showRuby',
	schema,
	onUpdate: (value) => {
		const app = document.querySelector('gs-app');

		if (!app) {
			return;
		}

		app.removeEventListener('click', toggleHandler);

		switch (value) {
			case 'toggle':
				app.classList.remove('ruby-hide');
				app.classList.add('ruby-toggle');
				app.addEventListener('click', toggleHandler);
				break;
			case 'show':
				app.classList.remove('ruby-hide');
				app.classList.remove('ruby-toggle');
				break;
			case 'hide':
				app.classList.remove('ruby-toggle');
				app.classList.add('ruby-hide');
				break;
		}
	},
});
