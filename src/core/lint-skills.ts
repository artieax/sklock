import { readFile } from "fs/promises";
import type { DiscoveredSkill } from "./scanner.js";

export interface LintIssue {
  skillId: string;
  level: "warn" | "error";
  message: string;
}

export const DEFAULT_MAX_LINES = 200;

export async function lintSkills(
  skills: DiscoveredSkill[],
  options: { maxLines?: number } = {}
): Promise<LintIssue[]> {
  const maxLines = options.maxLines ?? DEFAULT_MAX_LINES;
  const issues: LintIssue[] = [];
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
  return issues;
}
