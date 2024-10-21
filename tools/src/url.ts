import path from 'node:path';

export function join(url: URL, ...paths: readonly string[]) {
	return new URL(path.join(url.pathname, ...paths), url);
}

export default {
	join,
} as const;
