import { resolve } from "node:path";

import { runRealSeed } from "../src/seeds/seed-real.js";

const workspaceRoot = resolve(import.meta.dirname, "../../..");
const result = await runRealSeed({
  argumentsList: process.argv.slice(2).filter((argument) => argument !== "--"),
  seedDirectory: resolve(workspaceRoot, "data/staging/real-seed"),
});
console.log(JSON.stringify(result));
