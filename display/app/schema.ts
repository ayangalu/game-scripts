import { z } from 'zod';

const localizedRecord = z.intersection(
	z.record(
		z.custom<string>((key) => {
			if (typeof key !== 'string') {
				return false;
			}

			try {
				new Intl.Locale(key);
				return true;
			} catch {
				return key === '*';
			}
		}),
		z.string(),
	),
	z.object({
		'*': z.string(),
	}),
);

const dataTree: z.ZodType<DataTree> = z.record(z.lazy(() => z.union([dataTree, z.null()])));

export const gameEntrySchema: z.ZodType<GameEntry> = z.object({
	id: z.string().uuid(),
	title: localizedRecord,
	platform: z.union([z.literal('PC'), z.literal('Switch'), z.literal('Wii')]),
	version: z.string(),
	dataTree,
	locales: z.array(z.string()),
	ruby: z.array(z.string()).optional(),
	characters: z.record(localizedRecord).optional(),
});
