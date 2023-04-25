import { z } from 'zod';

import { VBF } from '../../parsers/virtuos/vbf.mjs';

const extractRoot = new URL(`./source/pc`, import.meta.url);
const env = z.object({ FF10_DATA: z.string() }).parse(process.env);
const vbf = new VBF(env.FF10_DATA);

vbf.extractTo(extractRoot.pathname.slice(1), (filePath) => !filePath.match(/\.(webm|png|fsb)$/));
