import { existsSync, statSync } from "fs";
import path from "path";
import { SkillScanError } from "../core/scanner.js";
import type { ValidationResult } from "../core/validator.js";

function isDirectory(filePath: string): boolean {
  try {
    return statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

export function resolveWorkspaceRoot(root?: string): string {
  if (root) return path.resolve(root);
  const start = path.resolve(process.cwd());
  let dir = start;
  const rootPath = path.parse(dir).root;
  let enclosingSkillsDir: string | undefined;

  while (true) {
    if (path.basename(dir) === "skills") {
      enclosingSkillsDir = path.resolve(dir);
    }
    const skillsDir = path.join(dir, "skills");
    if (existsSync(skillsDir) && isDirectory(skillsDir)) {
      const isEnclosingSkillsDir = path.resolve(skillsDir) === enclosingSkillsDir;
      const isInternalSkillsDir = existsSync(path.join(dir, "SKILL.md"));
      if (isEnclosingSkillsDir || isInternalSkillsDir) {
        // Ignore nested internal skills/ folders while walking toward the workspace root.
      } else {
        if (dir !== start) {
          console.warn(
            `sklock: using skills workspace at ${path.resolve(skillsDir)} (found by walking up from ${start})`
          );
        }
        return path.resolve(skillsDir);
      }
    }
    if (dir === rootPath) {
      break;
    }
    dir = path.dirname(dir);
  }

  if (enclosingSkillsDir) {
    return enclosingSkillsDir;
  }

  return path.join(start, "skills");
}

export function exitOnValidationErrors(
  result: ValidationResult,
  action: string,
  options?: { json?: boolean }
): void {
  if (result.valid) return;

  if (options?.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error(`✗ Refusing to ${action} with ${result.errors.length} validation error(s):`);
    for (const err of result.errors) {
      console.error(`  [${err.skillId}] ${err.message}`);
    }
  }
  process.exit(2);
}

export function runCommand(fn: () => Promise<void>): void {
  void fn().catch((err: unknown) => {
    if (err instanceof SkillScanError) {
      console.error(err.message);
      process.exit(2);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`sklock: ${message}`);
    if (process.env.SKLOCK_DEBUG) {
      console.error(err);
    }
    process.exit(1);
  });
}
