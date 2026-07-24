import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  isLoadDataCount,
  serializeSyntheticFactoryDocument,
  syntheticDataDigest,
} from "../src/seeds/generate-load-data.js";
import { loadRealSeedData } from "../src/seeds/real-seed-data.js";

function parseArguments(argumentsList: string[]): {
  count: 5_000 | 20_000;
  output: string;
} {
  const normalizedArguments = argumentsList.filter(
    (argument) => argument !== "--",
  );
  const countIndex = normalizedArguments.indexOf("--count");
  const outputIndex = normalizedArguments.indexOf("--output");
  const count = Number(normalizedArguments[countIndex + 1]);
  const output = normalizedArguments[outputIndex + 1];
  if (
    normalizedArguments.length !== 4 ||
    countIndex === -1 ||
    outputIndex === -1 ||
    !isLoadDataCount(count) ||
    output === undefined
  ) {
    throw new Error(
      "Usage: generate:load-data -- --count <5000|20000> --output <path>",
    );
  }
  return { count, output };
}

const workspaceRoot = resolve(import.meta.dirname, "../../..");
const argumentsValue = parseArguments(process.argv.slice(2));
const outputPath = resolve(workspaceRoot, argumentsValue.output);
const realSeed = await loadRealSeedData(
  resolve(workspaceRoot, "data/staging/real-seed"),
);
const content = serializeSyntheticFactoryDocument(
  argumentsValue.count,
  realSeed,
);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, content, "utf8");
console.log(
  JSON.stringify({
    count: argumentsValue.count,
    output: outputPath,
    bytes: Buffer.byteLength(content),
    sha256: syntheticDataDigest(content),
  }),
);
