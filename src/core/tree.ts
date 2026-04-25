import type { ResolvedSkill } from "./resolver.js";

export function renderTree(skills: ResolvedSkill[], indent = 0): string {
  const lines: string[] = [];
  const prefix = "  ".repeat(indent);
  for (const skill of skills) {
    lines.push(`${prefix}- ${skill.id}${skill.version ? `@${skill.version}` : ""}`);
    if (skill.resolvedRequires.length > 0) {
      for (const dep of skill.resolvedRequires) {
        lines.push(`${prefix}  requires: ${dep.id}`);
      }
    }
  }
  return lines.join("\n");
}
