import { selectEntry } from "./select-entry.js";

const gameRoot = await selectEntry("inspect");
await import(`../${gameRoot}/inspect.js`);
