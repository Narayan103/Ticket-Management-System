import { readFileSync } from "node:fs";
import { join } from "node:path";

export const KNOWLEDGE_BASE = readFileSync(join(import.meta.dir, "..", "knowledge-base.md"), "utf-8");
