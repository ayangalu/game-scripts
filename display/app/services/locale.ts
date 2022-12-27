const naturalLanguageName = new Intl.DisplayNames('en-US', { type: 'language' });

export const localeService = {
	format: (locale: string) => {
		const { language, region } = new Intl.Locale(locale);

		const name = naturalLanguageName.of(language);

		let flag = '';

		if (region) {
			flag = [...region.toUpperCase()].map((char) => String.fromCodePoint(char.codePointAt(0)! + 0x1f1a5)).join('');
		}

		return flag ? `${flag} ${name}` : name;
	},
} as const;
