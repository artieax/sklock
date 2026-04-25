import { scanSkills } from "../core/scanner.js";
import { generateLockfile, writeLockfile } from "../core/lockfile.js";
import { resolveWorkspaceRoot } from "./shared.js";

interface LockOptions {
  root?: string;
  json?: boolean;
}

export async function lockCommand(options: LockOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const skills = await scanSkills(root);
  const lockfile = await generateLockfile(skills, root);
  await writeLockfile(lockfile, root);

  if (options.json) {
    console.log(JSON.stringify(lockfile, null, 2));
  } else {
    console.log(`Generated skill.lock with ${Object.keys(lockfile.skills).length} skill(s).`);
  }
}
