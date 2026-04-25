import { scanSkills } from "../core/scanner.js";
import { resolveWorkspaceRoot } from "./shared.js";

interface WhyOptions {
  root?: string;
}

export async function whyCommand(skillId: string, options: WhyOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const skills = await scanSkills(root);

  const dependents = skills.filter((s) => s.requires?.includes(skillId));

  if (dependents.length === 0) {
    console.log(`${skillId} is not required by any other skill (it may be a root skill).`);
  } else {
    console.log(`${skillId} is required by:`);
    for (const dep of dependents) {
      console.log(`  ${dep.id}`);
    }
  }
}
