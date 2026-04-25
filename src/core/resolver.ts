import type { DiscoveredSkill } from "./scanner.js";

export interface ResolvedSkill extends DiscoveredSkill {
  resolvedRequires: DiscoveredSkill[];
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
