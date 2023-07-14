import { z } from 'zod';

import { persist } from './persist.js';

const schema = z.union([z.literal('alphabetical'), z.literal('platform')]);

export const menuView$ = persist<z.infer<typeof schema>>({
	initialValue: 'alphabetical',
	key: 'menuView',
	schema,
});
