import { readFile, writeFile } from "fs/promises";
import { createHash } from "crypto";
import path from "path";
import { LockfileSchema, type Lockfile, type LockEntry } from "../schema/lock.schema.js";
import type { DiscoveredSkill } from "./scanner.js";

export async function generateLockfile(
  skills: DiscoveredSkill[],
  root: string
): Promise<Lockfile> {
  const entries: Record<string, LockEntry> = {};
  for (const skill of skills) {
    const hash = createHash("sha256")
      .update(skill.id + (skill.version ?? "") + JSON.stringify(skill.requires))
      .digest("hex")
      .slice(0, 16);

    entries[skill.id] = {
      id: skill.id,
      path: path.relative(root, skill.path),
      version: skill.version,
      hash,
      requires: skill.requires ?? [],
    };
  }

  return {
    version: "1",
    generatedAt: new Date().toISOString(),
    skills: entries,
  };
}

export async function writeLockfile(lockfile: Lockfile, root: string): Promise<void> {
  const lockPath = path.join(root, "skill.lock");
  await writeFile(lockPath, JSON.stringify(lockfile, null, 2) + "\n", "utf-8");
}

export async function readLockfile(root: string): Promise<Lockfile | null> {
  try {
    const lockPath = path.join(root, "skill.lock");
    const content = await readFile(lockPath, "utf-8");
    return LockfileSchema.parse(JSON.parse(content));
  } catch {
    return null;
  }
}
