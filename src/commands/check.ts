import { scanSkills } from "../core/scanner.js";
import { generateLockfile, readLockfile } from "../core/lockfile.js";
import { resolveWorkspaceRoot } from "./shared.js";

interface CheckOptions {
  root?: string;
  frozen?: boolean;
  json?: boolean;
}

export async function checkCommand(options: CheckOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const skills = await scanSkills(root);
  const current = await generateLockfile(skills, root);
  const existing = await readLockfile(root);

  if (!existing) {
    console.error("No skill.lock found. Run `sklock lock` first.");
    if (options.frozen) process.exit(3);
    return;
  }

  const currentIds = Object.keys(current.skills).sort().join(",");
  const existingIds = Object.keys(existing.skills).sort().join(",");
  const isStale = currentIds !== existingIds;

  if (options.json) {
    console.log(JSON.stringify({ stale: isStale }, null, 2));
  } else if (isStale) {
    console.error("✗ skill.lock is stale. Run `sklock lock` to update.");
    if (options.frozen) process.exit(3);
  } else {
    console.log("✓ skill.lock is up to date.");
  }
}
