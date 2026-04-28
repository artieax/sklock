import { readFile } from "fs/promises";
import { scanSkills } from "../core/scanner.js";
import { resolveWorkspaceRoot } from "./shared.js";

interface ExplainOptions {
  root?: string;
  json?: boolean;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  return match ? match[1] : content;
}

export async function explainCommand(skillId: string, options: ExplainOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const { skills, warnings } = await scanSkills(root);
  for (const w of warnings) {
    console.warn(w.message);
  }
  const skill = skills.find((s) => s.id === skillId);

  if (!skill) {
    console.error(`Skill not found: ${skillId}`);
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(skill, null, 2));
    return;
  }

  console.log(`Skill: ${skill.id}`);
  if (skill.version) console.log(`Version: ${skill.version}`);
  if (skill.author) console.log(`Author: ${skill.author}`);
  if (skill.description) console.log(`Description: ${skill.description}`);
  if (skill.requires?.length) console.log(`Requires: ${skill.requires.join(", ")}`);
  if (skill.parentId) console.log(`Parent: ${skill.parentId}`);
  if (skill.tags?.length) console.log(`Tags: ${skill.tags.join(", ")}`);
  console.log(`Path: ${skill.path}`);

  try {
    const md = await readFile(skill.skillMdPath, "utf-8");
    const body = stripFrontmatter(md).trim();
    if (body) {
      console.log("\n---\n");
      console.log(body);
    }
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      console.warn(`Warning: ${skill.skillMdPath} disappeared between scan and read; body omitted.`);
      return;
    }
    throw error;
  }
}
