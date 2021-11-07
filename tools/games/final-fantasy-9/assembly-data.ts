import path from 'node:path';

import { CSharpFile } from '../../parsers/csharp';

const dataPath = `data/final-fantasy-9/extract/Assembly-CSharp`;

const textOpCodeModifierCS = new CSharpFile(path.join(dataPath, 'TextOpCodeModifier.cs'));
const mogIconTargetOpCode = textOpCodeModifierCS.parseArrayField<string>('MogIconTargetOpCode');
const mogIconReplacedOpCode = textOpCodeModifierCS.parseArrayField<string>('MogIconReplacedOpCode');

export const mogIconOpCode = Object.fromEntries(
	mogIconTargetOpCode.map((value, index) => [value, mogIconReplacedOpCode[index]] as const),
);

const ff9DBAll = new CSharpFile(path.join(dataPath, 'FF9DBAll.cs'));

export const eventDB = ff9DBAll.parseObjectField<string>('EventDB');
export const messageDB = ff9DBAll.parseObjectField<string>('MesDB');

const eventEngineUtils = new CSharpFile(path.join(dataPath, 'EventEngineUtils.cs'));

export const eventMessageMap = eventEngineUtils.parseObjectField<number>('eventIDToMESID');

void 0;
