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
  const ids = new Set(skills.map((s) => s.id));

  for (const skill of skills) {
    for (const req of skill.requires ?? []) {
      if (!ids.has(req)) {
        errors.push({
          skillId: skill.id,
          message: `Missing required skill: ${req}`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
