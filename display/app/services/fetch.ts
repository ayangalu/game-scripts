export const fetchService = {
	json: <T>(source: string) => fetch(source).then((response) => response.json()) as Promise<T>,
} as const;
