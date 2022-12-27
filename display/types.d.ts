interface MessageFormat {
	readonly [key: string]: null | MessageFormat;
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
	readonly key: string;
	readonly locale: string;
	readonly message: string;
}
