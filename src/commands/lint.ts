import { readFile } from "fs/promises";
import { scanSkills } from "../core/scanner.js";
import { validateSkills } from "../core/validator.js";
import { resolveWorkspaceRoot } from "./shared.js";

interface LintIssue {
  skillId: string;
  level: "warn" | "error";
  message: string;
}

interface LintOptions {
  root?: string;
  json?: boolean;
  quiet?: boolean;
  /** Max lines in SKILL.md before a split warning (default: 200). */
  maxLines?: number;
}

export const DEFAULT_MAX_LINES = 200;

function resolveMaxLines(raw: number | string | undefined): number {
  if (raw === undefined) return DEFAULT_MAX_LINES;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_LINES;
}

export async function lintCommand(options: LintOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const maxLines = resolveMaxLines(options.maxLines);
  const { skills, warnings: scanWarnings } = await scanSkills(root);
  for (const w of scanWarnings) {
    console.warn(w.message);
  }
  const validation = validateSkills(skills);
  const issues: LintIssue[] = validation.errors.map((error) => ({
    skillId: error.skillId,
    level: "error",
    message: error.message,
  }));

  for (const skill of skills) {
    const content = await readFile(skill.skillMdPath, "utf-8");
    const lineCount = content.split("\n").length;

    if (lineCount > maxLines) {
      issues.push({
        skillId: skill.id,
        level: "warn",
        message: `SKILL.md is ${lineCount} lines — consider splitting (threshold: ${maxLines})`,
      });
    }

    if (!skill.description) {
      issues.push({ skillId: skill.id, level: "warn", message: "No description in frontmatter" });
    }

    if (!skill.version) {
      issues.push({ skillId: skill.id, level: "warn", message: "No version in frontmatter" });
    }

    if (!/^#\s+.+$/m.test(content)) {
      issues.push({ skillId: skill.id, level: "warn", message: "No top-level heading (# ...) in SKILL.md body" });
    }
  }

  if (options.json) {
    console.log(JSON.stringify({ skills: skills.length, issues }, null, 2));
    if (issues.some((i) => i.level === "error")) process.exit(2);
    return;
  }

  if (!options.quiet) {
    console.log(`Linting ${skills.length} skill${skills.length === 1 ? "" : "s"}...\n`);
  }

  const bySkill = new Map<string, LintIssue[]>();
  for (const issue of issues) {
    if (!bySkill.has(issue.skillId)) bySkill.set(issue.skillId, []);
    bySkill.get(issue.skillId)!.push(issue);
  }

  if (!options.quiet) {
    for (const skill of skills) {
      const skillIssues = bySkill.get(skill.id) ?? [];
      if (skillIssues.length === 0) {
        console.log(`  ✓ ${skill.id}`);
      } else {
        console.log(`  ✗ ${skill.id}`);
        for (const issue of skillIssues) {
          console.log(`      [${issue.level}] ${issue.message}`);
        }
      }
    }
  }

  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.filter((i) => i.level === "warn").length;

  if (!options.quiet) {
    console.log(
      `\n${warnings} warning${warnings === 1 ? "" : "s"}, ${errors} error${errors === 1 ? "" : "s"}`
    );
  }

  if (errors > 0) process.exit(2);
}
