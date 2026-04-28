import type { DiscoveredSkill } from "./scanner.js";

export interface SkillTreeNode {
  skill: DiscoveredSkill;
  children: SkillTreeNode[];
}

export function buildTree(skills: DiscoveredSkill[]): SkillTreeNode[] {
  const ids = new Set(skills.map((skill) => skill.id));
  const roots = skills
    .filter((skill) => !skill.parentId || !ids.has(skill.parentId))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const childrenByParent = new Map<string, DiscoveredSkill[]>();

  for (const skill of skills) {
    if (!skill.parentId || !ids.has(skill.parentId)) continue;
    const siblings = childrenByParent.get(skill.parentId) ?? [];
    siblings.push(skill);
    childrenByParent.set(skill.parentId, siblings);
  }

  function buildNode(skill: DiscoveredSkill): SkillTreeNode {
    const children = [...(childrenByParent.get(skill.id) ?? [])]
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map(buildNode);
    return { skill, children };
  }

  return roots.map(buildNode);
}

export function renderTree(skills: DiscoveredSkill[]): string {
  const allIds = new Set(skills.map((s) => s.id));
  const roots = buildTree(skills);
  const lines: string[] = [];

  function pushLine(prefix: string, isLast: boolean, text: string): void {
    const connector = isLast ? "└── " : "├── ";
    lines.push(`${prefix}${connector}${text}`);
  }

  function renderSkill(
    node: SkillTreeNode,
    prefix: string,
    isLast: boolean,
    internal: boolean
  ): void {
    const { skill, children } = node;
    const orphan =
      skill.parentId && !allIds.has(skill.parentId)
        ? ` (orphan: missing parent "${skill.parentId}")`
        : "";
    const label = `${internal ? "[internal] " : ""}${skill.id}${
      skill.version ? `@${skill.version}` : ""
    }${orphan}`;
    pushLine(prefix, isLast, label);

    const childPrefix = prefix + (isLast ? "    " : "│   ");
    const hasRequires = skill.requires.length > 0;

    children.forEach((child, index) => {
      const childIsLast = !hasRequires && index === children.length - 1;
      renderSkill(child, childPrefix, childIsLast, true);
    });

    if (hasRequires) {
      pushLine(childPrefix, true, `requires: ${skill.requires.join(", ")}`);
    }
  }

  roots.forEach((node, index) => {
    renderSkill(node, "", index === roots.length - 1, false);
  });

  return lines.join("\n");
}
