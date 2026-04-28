import type { DiscoveredSkill } from "./scanner.js";

export interface ResolvedSkill extends DiscoveredSkill {
  resolvedRequires: DiscoveredSkill[];
}

export interface MissingDependency {
  skillId: string;
  missingId: string;
}

export function resolveSkills(skills: DiscoveredSkill[]): ResolvedSkill[] {
  const byId = new Map(skills.map((s) => [s.id, s]));
  return skills.map((skill) => ({
    ...skill,
    resolvedRequires: (skill.requires ?? [])
      .map((id) => byId.get(id))
      .filter((s): s is DiscoveredSkill => s !== undefined),
  }));
}

export function resolveSkillsStrict(skills: DiscoveredSkill[]): {
  resolved: ResolvedSkill[];
  missing: MissingDependency[];
} {
  const byId = new Map(skills.map((s) => [s.id, s]));
  const missing: MissingDependency[] = [];
  const resolved = skills.map((skill) => {
    const resolvedRequires: DiscoveredSkill[] = [];
    for (const id of skill.requires ?? []) {
      const dep = byId.get(id);
      if (dep) {
        resolvedRequires.push(dep);
      } else {
        missing.push({ skillId: skill.id, missingId: id });
      }
    }
    return { ...skill, resolvedRequires };
  });
  return { resolved, missing };
}
