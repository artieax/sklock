import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { scanSkills } from "../core/scanner.js";
import { generateLockfile, writeLockfile } from "../core/lockfile.js";
import { validateSkills } from "../core/validator.js";
import { exitOnValidationErrors, resolveWorkspaceRoot } from "./shared.js";

interface LockOptions {
  root?: string;
  json?: boolean;
}

function readSklockVersion(): string | undefined {
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(path.resolve(dir, "../package.json"), "utf-8")) as { version?: string };
    return typeof pkg.version === "string" ? pkg.version : undefined;
  } catch {
    return undefined;
  }
}

export async function lockCommand(options: LockOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const { skills, warnings } = await scanSkills(root);
  for (const w of warnings) {
    console.warn(w.message);
  }
  exitOnValidationErrors(validateSkills(skills), "write skill.lock", { json: options.json });

  const version = readSklockVersion();
  const generatedBy = version ? { name: "sklock", version } : undefined;
  const lockfile = await generateLockfile(skills, root, { generatedBy });
  await writeLockfile(lockfile, root);

  if (options.json) {
    console.log(JSON.stringify(lockfile, null, 2));
  } else {
    console.log(`Generated skill.lock with ${Object.keys(lockfile.skills).length} skill(s).`);
  }
}
