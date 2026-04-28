import type { DiscoveredSkill } from "./scanner.js";

export interface ValidationError {
  skillId: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateSkills(skills: DiscoveredSkill[]): ValidationResult {
  const errors: ValidationError[] = [];
  const idToFirstPath = new Map<string, string>();

  for (const skill of skills) {
    const firstPath = idToFirstPath.get(skill.id);
    if (firstPath !== undefined) {
      errors.push({
        skillId: skill.id,
        message: `Duplicate skill ID: ${skill.id} at ${skill.skillMdPath} (also defined at ${firstPath})`,
      });
    } else {
      idToFirstPath.set(skill.id, skill.skillMdPath);
    }
  }

  const ids = new Set(idToFirstPath.keys());

  for (const skill of skills) {
    for (const req of skill.requires ?? []) {
      if (!ids.has(req)) {
        errors.push({
          skillId: skill.id,
          message: `Missing required skill: ${req} (referenced from ${skill.skillMdPath})`,
        });
      }
    }
  }

  const byId = new Map(skills.map((s) => [s.id, s]));
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const seenCycleKeys = new Set<string>();

  function dfs(id: string, path: string[]): void {
    if (inStack.has(id)) {
      const start = path.indexOf(id);
      const ring = start >= 0 ? path.slice(start) : [id];
      let minIdx = 0;
      for (let k = 1; k < ring.length; k++) {
        if (ring[k]! < ring[minIdx]!) minIdx = k;
      }
      const rotated = [...ring.slice(minIdx), ...ring.slice(0, minIdx)];
      const key = rotated.join("\0");
      if (seenCycleKeys.has(key)) return;
      seenCycleKeys.add(key);
      const cycleNodes = start >= 0 ? [...path.slice(start), id] : [...path, id];
      const cycle = cycleNodes.join(" → ");
      const atPath = byId.get(id)?.skillMdPath ?? id;
      errors.push({ skillId: id, message: `Circular dependency: ${cycle} (at ${atPath})` });
      return;
    }
    if (visited.has(id)) return;
    visited.add(id);
    inStack.add(id);
    for (const req of byId.get(id)?.requires ?? []) {
      if (ids.has(req)) dfs(req, [...path, id]);
    }
    inStack.delete(id);
  }

  for (const skill of skills) {
    if (!visited.has(skill.id)) dfs(skill.id, []);
  }

  return { valid: errors.length === 0, errors };
}
