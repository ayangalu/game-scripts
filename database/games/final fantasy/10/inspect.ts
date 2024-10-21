import { object, parse } from 'tashikame';

import { VBF } from '@game-scripts/tools/parsers/virtuos/vbf.js';

const extractRoot = new URL(`./source/pc`, import.meta.url);
const env = parse(object({ FF10_DATA: "string" }, { additionalProperties: true }), process.env);
const vbf = new VBF(env.FF10_DATA);

vbf.extractTo(decodeURI(extractRoot.pathname).slice(1), (filePath) => !filePath.match(/\.(webm|png|fsb)$/));
