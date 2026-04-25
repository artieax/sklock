import fg from "fast-glob";
import { readFile } from "fs/promises";
import { parse } from "yaml";
import path from "path";
import { SkillSchema, type Skill } from "../schema/skill.schema.js";

export interface DiscoveredSkill extends Skill {
  path: string;
  skillYmlPath: string;
}

export async function scanSkills(root: string): Promise<DiscoveredSkill[]> {
  const patterns = ["**/skill.yml", "!**/node_modules/**"];
  const files = await fg(patterns, { cwd: root, absolute: true });

  const skills: DiscoveredSkill[] = [];
  for (const file of files) {
    const content = await readFile(file, "utf-8");
    const raw = parse(content);
    const parsed = SkillSchema.safeParse(raw);
    if (parsed.success) {
      skills.push({
        ...parsed.data,
        path: path.dirname(file),
        skillYmlPath: file,
      });
    } else {
      console.warn(`Warning: invalid skill.yml at ${file}`);
    }
  }
  return skills;
}
