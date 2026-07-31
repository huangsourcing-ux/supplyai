import "reflect-metadata";

import { restoreBackup } from "./backups/backup-restore.js";

await restoreBackup(process.argv.slice(2));
