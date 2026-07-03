import { selectEntry } from "./select-entry.ts";

const gameRoot = await selectEntry("inspect");
await import(`../${gameRoot}/inspect.ts`);
