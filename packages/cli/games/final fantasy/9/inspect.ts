import path from "node:path/posix";

import { ensure } from "#/util/ensure.ts";
import { nestedRecord } from "#/util/nested-record.ts";

import { aligned } from "./load-messages.ts";

const find = (text: string) => {
	for (const entry of aligned.entries()) {
		if (entry.value.includes(text)) {
			console.log(entry.path);
		}
	}
};

const tags = nestedRecord<3, string>();
const qualifiers = nestedRecord<2, string>();

for (const entry of aligned.entries()) {
	const destination = path.join(...entry.path);
	const codes = new Set([ ...entry.value.matchAll(/\[(.+?)\]/g), ].map(([ _, code, ]) => ensure(code)));

	for (const code of codes) {
		const tagMatch = code.match(/([A-Z]{3}[A-Z0-9])(?:=(.+))?/);

		if (tagMatch) {
			const [ _, tagName, option, ] = tagMatch;
			tags.set([ ensure(tagName), option ?? "", destination, ], entry.value);
		} else {
			qualifiers.set([ code, destination, ], entry.value);
		}
	}
}

debugger;
