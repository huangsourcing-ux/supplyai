import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { openApiDocument } from "../src/openapi/openapi-document.js";

const outputPath = fileURLToPath(new URL("../openapi.json", import.meta.url));

await writeFile(outputPath, `${JSON.stringify(openApiDocument, null, 2)}\n`);
