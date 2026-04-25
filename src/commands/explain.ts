import { readFile } from "fs/promises";
import path from "path";
import { scanSkills } from "../core/scanner.js";
import { resolveWorkspaceRoot } from "./shared.js";

interface ExplainOptions {
  root?: string;
  json?: boolean;
}

export async function explainCommand(skillId: string, options: ExplainOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const skills = await scanSkills(root);
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
  if (skill.description) console.log(`Description: ${skill.description}`);
  if (skill.requires?.length) console.log(`Requires: ${skill.requires.join(", ")}`);
  if (skill.tags?.length) console.log(`Tags: ${skill.tags.join(", ")}`);
  console.log(`Path: ${skill.path}`);

  const skillMdPath = path.join(skill.path, "SKILL.md");
  try {
    const md = await readFile(skillMdPath, "utf-8");
    console.log("\n---\n");
    console.log(md.slice(0, 500));
  } catch {
    // no SKILL.md
  }
}
