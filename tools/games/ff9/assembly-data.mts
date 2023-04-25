import { CSharpFile } from '../../parsers/csharp/index.mjs';
import url from '../../url.mjs';

const dataPath = new URL(`./source/pc/Assembly-CSharp`, import.meta.url);

const textOpCodeModifierCS = new CSharpFile(url.join(dataPath, 'TextOpCodeModifier.cs'));
const mogIconTargetOpCode = textOpCodeModifierCS.parseArrayField<string>('MogIconTargetOpCode');
const mogIconReplacedOpCode = textOpCodeModifierCS.parseArrayField<string>('MogIconReplacedOpCode');

export const mogIconOpCode = Object.fromEntries(
	mogIconTargetOpCode.map((value, index) => [value, mogIconReplacedOpCode[index]] as const),
);

const dbAll = new CSharpFile(url.join(dataPath, 'FF9DBAll.cs'));

export const messageDB = dbAll.parseObjectField<string>('MesDB');

const dbBattle = new CSharpFile(url.join(dataPath, 'FF9BattleDB.cs'));

export const sceneData = dbBattle.parseObjectField<number>('SceneData');

const eventEngineUtils = new CSharpFile(url.join(dataPath, 'EventEngineUtils.cs'));

export const eventMessageMap = eventEngineUtils.parseObjectField<number>('eventIDToMESID');

const uiDataTool = new CSharpFile(url.join(dataPath, 'Assets/Sources/Scripts/UI/Common/FF9UIDataTool.cs'));

export const iconMap = {
	...uiDataTool.parseObjectField<string>('IconSpriteName'),
	...uiDataTool.parseObjectField<string>('TutorialIconSpriteName'),
};
