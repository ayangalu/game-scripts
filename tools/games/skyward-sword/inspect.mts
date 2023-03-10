import { controlCodes, readMSBT } from '../../parsers/nintendo/message-studio/inspect.mjs';

const msbts = readMSBT(`data/${process.argv[2]}${process.argv[3] ?? ''}/messages`);

const result = controlCodes(msbts, {
	ignore: {
		0: [
			0, // ruby
			2, // seems to be used only accidentally, apparently also controls font size
			3, // color
		],
		1: [
			0,
			1,
			2,
			3, // multiple choices
			4, // pause
			6, // text speed
			// 7, // (?) sound effect
			8, // font size
			0xf, // (?) floating message
		],
		2: [
			0, // player name
			1, // item name
			2, // situational variable (e.g. current bugs to sell)
			3, // numeric variable (e.g. time spent in minigame)
			4, // picture font glyph
			5, // inline control animation (switch only)
		],
		3: [
			0, // superscript
			// 1, // capitalization
			2, // korean particles that change with the final of the preceding word
			3, // japanese counter from word.msbt
			4, // plural form from word.msbt
		],
	},
});

debugger;
