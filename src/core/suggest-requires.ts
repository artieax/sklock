import fg from "fast-glob";
import { readFile } from "fs/promises";
import path from "path";
import { scanSkills } from "./scanner.js";

export interface RequiresSuggestion {
  skillId: string;
  suggestions: Array<{ depId: string; foundIn: string }>;
}

/**
 * Check whether the content of a file references another skill's ID using
 * any of the supported heuristics:
 *   1. Path patterns: skills/<id>/, .agent/skill/<id>/, sub-skills/<id>/
 *   2. HTML comments in SKILL.md: <!-- READ: .../<id>/ -->
 *   3. Script imports/requires in .py/.js/.ts/.sh: any string containing the skill dir name
 */
function findReferences(content: string, depId: string, filePath: string): boolean {
  // Heuristic 1: path patterns
  const pathPattern = new RegExp(
    `(?:skills|sub-skills|\\.agent/skill)/${escapeRegex(depId)}/`,
    "i"
  );
  if (pathPattern.test(content)) return true;

  // Heuristic 2: HTML comment READ directives in SKILL.md
  if (path.basename(filePath) === "SKILL.md") {
    const commentPattern = new RegExp(
      `<!--\\s*READ:\\s*[^>]*/${escapeRegex(depId)}/`,
      "i"
    );
    if (commentPattern.test(content)) return true;
  }

  // Heuristic 3: script imports/requires in .py/.js/.ts/.sh files
  const ext = path.extname(filePath).toLowerCase();
  if ([".py", ".js", ".ts", ".sh"].includes(ext)) {
    // Match any import/require/source statement that contains the skill ID
    const importPattern = new RegExp(
      `(?:import|require|from|source)\\s[^\\n]*${escapeRegex(depId)}`,
      "i"
    );
    if (importPattern.test(content)) return true;

    // Also match any string literal containing the skill ID as a path segment
    const stringPattern = new RegExp(
      `["'\`][^"'\`]*/${escapeRegex(depId)}(?:/[^"'\`]*)?["'\`]`,
      "i"
    );
    if (stringPattern.test(content)) return true;
  }

  return false;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns the relative path from the skill's directory for display.
 */
function relativeFoundIn(skillDir: string, filePath: string): string {
  return path.relative(skillDir, filePath);
}

export async function suggestRequires(root: string): Promise<RequiresSuggestion[]> {
  const { skills } = await scanSkills(root);

  const results: RequiresSuggestion[] = [];

  for (const skill of skills) {
    const existingRequires = new Set(skill.requires);
    const potentialDeps = skills.filter((s) => s.id !== skill.id && !existingRequires.has(s.id));

    if (potentialDeps.length === 0) {
      results.push({ skillId: skill.id, suggestions: [] });
      continue;
    }

    // Collect all text files in the skill's directory
    const files = await fg("**/*", {
      cwd: skill.path,
      absolute: true,
      onlyFiles: true,
      followSymbolicLinks: false,
      ignore: ["**/node_modules/**", "**/.git/**"],
    });

    // Read all files (skip binaries by catching errors)
    const fileContents: Array<{ filePath: string; content: string }> = [];
    for (const filePath of files) {
      try {
        const content = await readFile(filePath, "utf-8");
        fileContents.push({ filePath, content });
      } catch {
        // Skip binary or unreadable files
      }
    }

    // Track one representative "foundIn" per dep (first file that references it)
    const foundDeps = new Map<string, string>();

    for (const { filePath, content } of fileContents) {
      for (const dep of potentialDeps) {
        if (!foundDeps.has(dep.id) && findReferences(content, dep.id, filePath)) {
          foundDeps.set(dep.id, relativeFoundIn(skill.path, filePath));
        }
      }
    }

    const suggestions = Array.from(foundDeps.entries()).map(([depId, foundIn]) => ({
      depId,
      foundIn,
    }));

    results.push({ skillId: skill.id, suggestions });
  }

  return results;
}
