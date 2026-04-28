import { scanSkills } from "../core/scanner.js";
import { generateLockfile, writeLockfile } from "../core/lockfile.js";
import { validateSkills } from "../core/validator.js";
import { exitOnValidationErrors, resolveWorkspaceRoot } from "./shared.js";

interface LockOptions {
  root?: string;
  json?: boolean;
}

export async function lockCommand(options: LockOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const { skills, warnings } = await scanSkills(root);
  for (const w of warnings) {
    console.warn(w.message);
  }
  exitOnValidationErrors(validateSkills(skills), "write skill.lock", { json: options.json });

  const lockfile = await generateLockfile(skills, root);
  await writeLockfile(lockfile, root);

  if (options.json) {
    console.log(JSON.stringify(lockfile, null, 2));
  } else {
    console.log(`Generated skill.lock with ${Object.keys(lockfile.skills).length} skill(s).`);
  }
}
