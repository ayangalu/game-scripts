import { readdirSync } from 'node:fs';

import { U8 } from '../u8.mjs';
import { MSBT } from './msbt.mjs';

export function readMSBT(source: string) {
	return Object.fromEntries(
		readdirSync(source).map(
			(locale) =>
				[
					locale,
					readdirSync(`${source}/${locale}`).reduce<Record<string, MSBT>>((msbts, file) => {
						const p = `${source}/${locale}/${file}`;

						if (file.endsWith('.msbt')) {
							msbts[file] = new MSBT(p);
						}

						if (file.endsWith('.arc')) {
							new U8(p).files.forEach(({ name, data }) => {
								if (name.endsWith('.msbt')) {
									msbts[name] = new MSBT(data);
								}
							});
						}

						return msbts;
					}, {}),
				] as const,
		),
	);
}

export function controlCodes(source: NRecord<string, MSBT, 2>, ignore: Record<number, number[]> = {}) {
	const result: NRecord<number, NRecord<string, unknown[], 4>, 3> = Object.create(null, {
		0x0e: { value: Object.create(null, {}) },
		0x0f: { value: Object.create(null, {}) },
	});

	Object.entries(source).forEach(([locale, msbts]) => {
		Object.entries(msbts).forEach(([file, msbt]) => {
			msbt.blocks.TXT2?.forEach((message, index) => {
				message.forEach((part) => {
					if (typeof part === 'object') {
						if (ignore[part.group]?.includes(part.tag)) {
							return;
						}

						const p = part.parameters?.buffer.toString('hex') ?? 'N/A';

						const tags = result[part.code][part.group] ?? Object.create(null, {});
						const parameters = tags[part.tag] ?? Object.create(null, {});
						const locales = parameters[p] ?? Object.create(null, {});
						const files = locales[locale] ?? Object.create(null, {});
						const labels = files[file] ?? Object.create(null, {});

						const label = msbt.blocks.LBL1![index];

						labels[label] = message.map((m) => {
							if (typeof m === 'string') {
								return m;
							}

							return Object.create(null, {
								code: { value: m.code },
								group: { value: m.group },
								tag: { value: m.tag },
								...(m.parameters
									? {
											parameters: { value: m.parameters.buffer.toString('hex') },
											reader: { value: m.parameters },
									  }
									: {}),
							});
						});

						parameters[p] = locales;
						files[file] = labels;
						locales[locale] = files;

						tags[part.tag] = parameters;
						result[part.code][part.group] = tags;
					}
				});
			});
		});
	});

	return result;
}
