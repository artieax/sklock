import { scanSkills } from "../core/scanner.js";
import { resolveWorkspaceRoot } from "./shared.js";

interface WhyOptions {
  root?: string;
}

export async function whyCommand(skillId: string, options: WhyOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const { skills, warnings } = await scanSkills(root);
  for (const w of warnings) {
    console.warn(w.message);
  }
  const byId = new Map(skills.map((s) => [s.id, s]));

  if (!byId.has(skillId)) {
    console.error(`Skill not found: ${skillId}`);
    process.exit(1);
  }

  const dependents = new Map<string, string[]>();
  for (const skill of skills) {
    for (const req of skill.requires ?? []) {
      if (!dependents.has(req)) dependents.set(req, []);
      dependents.get(req)!.push(skill.id);
    }
  }

  const directDeps = dependents.get(skillId) ?? [];
  if (directDeps.length === 0) {
    const skill = byId.get(skillId)!;
    if (skill.parentId) {
      console.log(`${skillId} is an internal skill under ${skill.parentId} and is not required by any skill.`);
    } else {
      console.log(`${skillId} is not required by any skill (root skill).`);
    }
    return;
  }

  console.log(`${skillId} is required by:`);

  function print(id: string, prefix: string, isLast: boolean, seen: Set<string>): void {
    const connector = isLast ? "└── " : "├── ";
    if (seen.has(id)) {
      console.log(`${prefix}${connector}${id} (circular)`);
      return;
    }
    console.log(`${prefix}${connector}${id}`);
    const deps = dependents.get(id) ?? [];
    const childPrefix = prefix + (isLast ? "    " : "│   ");
    const nextSeen = new Set(seen).add(id);
    deps.forEach((dep, i) => print(dep, childPrefix, i === deps.length - 1, nextSeen));
  }

  directDeps.forEach((dep, i) =>
    print(dep, "", i === directDeps.length - 1, new Set([skillId]))
  );
}
