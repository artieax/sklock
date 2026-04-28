import { readFile } from "fs/promises";
import { scanSkills } from "../core/scanner.js";
import { validateSkills } from "../core/validator.js";
import { generateLockfile, readLockfile } from "../core/lockfile.js";
import { resolveWorkspaceRoot } from "./shared.js";
import type { ValidationError } from "../core/validator.js";

interface LintIssue {
  skillId: string;
  level: "warn" | "error";
  message: string;
}

interface LockfileStatus {
  exists: boolean;
  stale: boolean;
  added: string[];
  removed: string[];
  changed: string[];
}

export interface DoctorResult {
  workspace: string;
  skillCount: number;
  validationErrors: ValidationError[];
  lockfile: LockfileStatus;
  lintIssues: LintIssue[];
  healthy: boolean;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  if (value === undefined) return "undefined";
  return JSON.stringify(value);
}

const DEFAULT_MAX_LINES = 200;

interface DoctorOptions {
  root?: string;
  json?: boolean;
}

export async function doctorCommand(options: DoctorOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const { skills, warnings } = await scanSkills(root);

  for (const w of warnings) {
    if (!options.json) console.warn(w.message);
  }

  const validation = validateSkills(skills);

  const existing = await readLockfile(root);
  let lockStatus: LockfileStatus;

  if (!existing) {
    lockStatus = {
      exists: false,
      stale: true,
      added: Object.keys((await generateLockfile(skills, root)).skills).sort(),
      removed: [],
      changed: [],
    };
  } else {
    const current = await generateLockfile(skills, root);
    const currentKeys = Object.keys(current.skills).sort();
    const existingKeys = Object.keys(existing.skills).sort();
    const added = currentKeys.filter((k) => !existing.skills[k]);
    const removed = existingKeys.filter((k) => !current.skills[k]);
    const changed = currentKeys.filter(
      (k) => existing.skills[k] && stableStringify(existing.skills[k]) !== stableStringify(current.skills[k])
    );
    lockStatus = {
      exists: true,
      stale: added.length > 0 || removed.length > 0 || changed.length > 0,
      added,
      removed,
      changed,
    };
  }

  const lintIssues: LintIssue[] = [];
  for (const skill of skills) {
    const content = await readFile(skill.skillMdPath, "utf-8");
    const lineCount = content.split("\n").length;
    if (lineCount > DEFAULT_MAX_LINES) {
      lintIssues.push({ skillId: skill.id, level: "warn", message: `SKILL.md is ${lineCount} lines — consider splitting` });
    }
    if (!skill.description) {
      lintIssues.push({ skillId: skill.id, level: "warn", message: "No description in frontmatter" });
    }
    if (!skill.version) {
      lintIssues.push({ skillId: skill.id, level: "warn", message: "No version in frontmatter" });
    }
    if (!/^#\s+.+$/m.test(content)) {
      lintIssues.push({ skillId: skill.id, level: "warn", message: "No top-level heading (# ...) in SKILL.md body" });
    }
  }

  const healthy =
    validation.errors.length === 0 &&
    !lockStatus.stale &&
    lintIssues.filter((i) => i.level === "error").length === 0;

  const result: DoctorResult = {
    workspace: root,
    skillCount: skills.length,
    validationErrors: validation.errors,
    lockfile: lockStatus,
    lintIssues,
    healthy,
  };

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    if (!healthy) process.exit(1);
    return;
  }

  console.log(`Diagnosing workspace: ${root} (${skills.length} skill${skills.length === 1 ? "" : "s"})\n`);

  if (validation.errors.length === 0) {
    console.log("  ✓ Validation passed");
  } else {
    console.log(`  ✗ Validation failed (${validation.errors.length} error${validation.errors.length === 1 ? "" : "s"})`);
    for (const err of validation.errors) {
      console.log(`      [${err.skillId}] ${err.message}`);
    }
  }

  if (!lockStatus.exists) {
    console.log("  ✗ skill.lock not found — run `sklock lock` to generate");
  } else if (!lockStatus.stale) {
    console.log("  ✓ skill.lock is up to date");
  } else {
    console.log("  ✗ skill.lock is stale — run `sklock lock` to update");
    if (lockStatus.added.length) console.log(`      Added:   ${lockStatus.added.join(", ")}`);
    if (lockStatus.removed.length) console.log(`      Removed: ${lockStatus.removed.join(", ")}`);
    if (lockStatus.changed.length) console.log(`      Changed: ${lockStatus.changed.join(", ")}`);
  }

  const warnCount = lintIssues.filter((i) => i.level === "warn").length;
  const errCount = lintIssues.filter((i) => i.level === "error").length;
  if (lintIssues.length === 0) {
    console.log("  ✓ Lint clean");
  } else {
    const counts: string[] = [];
    if (errCount) counts.push(`${errCount} error${errCount === 1 ? "" : "s"}`);
    if (warnCount) counts.push(`${warnCount} warning${warnCount === 1 ? "" : "s"}`);
    const symbol = errCount > 0 ? "✗" : "⚠";
    console.log(`  ${symbol} ${counts.join(", ")}`);
    const bySkill = new Map<string, LintIssue[]>();
    for (const issue of lintIssues) {
      if (!bySkill.has(issue.skillId)) bySkill.set(issue.skillId, []);
      bySkill.get(issue.skillId)!.push(issue);
    }
    for (const [skillId, issues] of bySkill) {
      for (const issue of issues) {
        console.log(`      [${issue.level}] ${skillId}: ${issue.message}`);
      }
    }
  }

  const totalErrors = validation.errors.length + errCount + (lockStatus.stale ? 1 : 0);
  console.log(`\nSummary: ${healthy ? "healthy" : `${totalErrors} error${totalErrors === 1 ? "" : "s"}${warnCount ? `, ${warnCount} warning${warnCount === 1 ? "" : "s"}` : ""}`}`);

  if (!healthy) process.exit(1);
}
