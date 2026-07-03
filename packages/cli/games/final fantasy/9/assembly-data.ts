import path from "node:path";

import { CSharpFile } from "#/parsers/csharp/index.ts";

import { exportPath } from "./prepare.ts";

const disassemblyPath = path.join(exportPath, "ExportedProject/Assets/Scripts/Assembly-CSharp");

const textOpCodeModifierCS = new CSharpFile(path.join(disassemblyPath, "TextOpCodeModifier.cs"));
const mogIconTargetOpCode = textOpCodeModifierCS.parseArrayField<string>("MogIconTargetOpCode");
const mogIconReplacedOpCode = textOpCodeModifierCS.parseArrayField<string>("MogIconReplacedOpCode");

export const mogIconOpCode = Object.fromEntries(
	mogIconTargetOpCode.map((value, index) => [ value, mogIconReplacedOpCode[index], ] as const),
);

const dbAll = new CSharpFile(path.join(disassemblyPath, "FF9DBAll.cs"));

export const messageDB = dbAll.parseObjectField<string>("MesDB");

const dbBattle = new CSharpFile(path.join(disassemblyPath, "FF9BattleDB.cs"));

export const sceneData = dbBattle.parseObjectField<number>("SceneData");

const eventEngineUtils = new CSharpFile(path.join(disassemblyPath, "EventEngineUtils.cs"));

export const eventMessageMap = eventEngineUtils.parseObjectField<number>("eventIDToMESID");

const uiDataTool = new CSharpFile(path.join(disassemblyPath, "Assets/Sources/Scripts/UI/Common/FF9UIDataTool.cs"));

export const iconMap = {
	...uiDataTool.parseObjectField<string>("IconSpriteName"),
	...uiDataTool.parseObjectField<string>("TutorialIconSpriteName"),
};
