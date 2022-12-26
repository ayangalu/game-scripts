interface MessageFormat {
	readonly [key: string]: 'dict' | 'list' | MessageFormat;
}

type Message = Readonly<Record<string, string>>;
type MessageList = readonly Message[];
type MessageDict = Readonly<Record<string, Message>>;

interface MessageData {
	readonly [key: string]: MessageList | MessageDict | MessageData;
}

type SubTreeProcessor<T> = (templates: {
	forWildcard: (name: string, subTree: MessageData[string]) => T;
	forEntry: () => T;
}) => void;

interface SearchIndexLocation {
	readonly path: readonly string[];
	readonly key: number;
	readonly locale: string;
	readonly message: string;
}
