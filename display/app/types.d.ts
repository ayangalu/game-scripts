type TargetEvent<T extends Element, E extends Event = Event> = E & { currentTarget: T };

interface GameInfo {
	readonly root: string;
	readonly messageFormat: MessageFormat;
	readonly locales: readonly string[];
	readonly ruby?: readonly string[];
	readonly characters?: ReadonlyDict<string | ReadonlyDict<string>>;
}

interface GameData {
	readonly info: GameInfo;
	readonly data: MessageData;
	readonly search: Worker;
	readonly indexed: Promise<void>;
}

interface PathItem {
	readonly item: import('@shoelace-style/shoelace').SlTreeItem;
	readonly label: string;
}

// type SlSelectSingle = import('@shoelace-style/shoelace').SlSelect & {
// 	readonly multiple: false;
// 	value: string;
// };
