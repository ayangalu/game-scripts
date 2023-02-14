import { VBF } from '../../parsers/virtuos/vbf.mjs';

const vbf = new VBF(`D://SteamLibrary/steamapps/common/FINAL FANTASY FFX&FFX-2 HD Remaster/data/FFX_Data.vbf`);

vbf.extractTo(`data/final-fantasy-10-hd/extract`, (filePath) => !filePath.match(/\.(webm|png|fsb)$/));
