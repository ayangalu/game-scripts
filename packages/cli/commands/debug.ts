import { selectEntry } from "./select-entry.ts";

const gameRoot = await selectEntry("debug");
await import(`../${gameRoot}/debug.ts`);
