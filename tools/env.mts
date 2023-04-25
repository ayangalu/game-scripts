import { config } from 'dotenv';

try {
	const path = new URL(`./games/${process.argv[2]}/.env`, import.meta.url);
	config({ path: path.pathname.slice(1) });
} catch {}
