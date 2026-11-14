import { readFileSync } from "node:fs";
import path from "node:path";

try {
  const envFile = readFileSync(path.join(process.cwd(), ".env"), "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* Vercel injects env; local .env may be missing */
}
