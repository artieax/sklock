import { describe, expect, it } from "vitest";
import type { DiscoveredSkill } from "./scanner.js";
import { validateSkills } from "./validator.js";

function sk(
  id: string,
  requires: string[],
  extra: Partial<DiscoveredSkill> = {}
): DiscoveredSkill {
  return {
    id,
    name: id,
    requires,
    tags: [],
    path: `/${id}`,
    skillMdPath: `/${id}/SKILL.md`,
    ...extra,
  };
}

describe("validateSkills", () => {
  it("reports each dependency cycle only once (triangle)", () => {
    const skills = [
      sk("a", ["b"]),
      sk("b", ["c"]),
      sk("c", ["a"]),
    ];
    const result = validateSkills(skills);
    expect(result.valid).toBe(false);
    const cycles = result.errors.filter((e) => e.message.startsWith("Circular dependency:"));
    expect(cycles).toHaveLength(1);
  });

  it("dedupes the same cycle reached from different orderings", () => {
    const skills = [
      sk("a", ["b"]),
      sk("b", ["c"]),
      sk("c", ["b"]),
    ];
    const result = validateSkills(skills);
    expect(result.valid).toBe(false);
    const cycles = result.errors.filter((e) => e.message.startsWith("Circular dependency:"));
    expect(cycles).toHaveLength(1);
  });

  it("includes an arrow chain in every circular dependency message", () => {
    const skills = [sk("a", ["b"]), sk("b", ["c"]), sk("c", ["a"])];
    const result = validateSkills(skills);
    const cycles = result.errors.filter((e) => e.message.startsWith("Circular dependency:"));
    expect(cycles.length).toBeGreaterThan(0);
    for (const e of cycles) {
      expect(e.message).toMatch(/ → /);
    }
  });

  it("reports duplicate skill IDs with both paths", () => {
    const skills = [
      sk("dup", [], { skillMdPath: "/first/SKILL.md", path: "/first" }),
      sk("dup", [], { skillMdPath: "/second/SKILL.md", path: "/second" }),
    ];
    const result = validateSkills(skills);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("Duplicate skill ID"))).toBe(true);
    expect(result.errors.some((e) => e.message.includes("/first/SKILL.md"))).toBe(true);
    expect(result.errors.some((e) => e.message.includes("/second/SKILL.md"))).toBe(true);
  });

  it("reports missing requires with referencing path", () => {
    const skills = [sk("a", ["missing"], { skillMdPath: "/a/SKILL.md" })];
    const result = validateSkills(skills);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      {
        skillId: "a",
        message: "Missing required skill: missing (referenced from /a/SKILL.md)",
      },
    ]);
  });

  it("reports a self-cycle (a → a)", () => {
    const skills = [sk("a", ["a"])];
    const result = validateSkills(skills);
    expect(result.valid).toBe(false);
    const cycles = result.errors.filter((e) => e.message.startsWith("Circular dependency:"));
    expect(cycles).toHaveLength(1);
    expect(cycles[0]!.message).toContain("a → a");
  });

  it("reports a single normalized cycle for a 4-node ring", () => {
    const skills = [sk("a", ["b"]), sk("b", ["c"]), sk("c", ["d"]), sk("d", ["a"])];
    const result = validateSkills(skills);
    expect(result.valid).toBe(false);
    const cycles = result.errors.filter((e) => e.message.startsWith("Circular dependency:"));
    expect(cycles).toHaveLength(1);
  });

  it("reports two disjoint cycles separately", () => {
    const skills = [sk("a", ["b"]), sk("b", ["a"]), sk("c", ["d"]), sk("d", ["c"])];
    const result = validateSkills(skills);
    expect(result.valid).toBe(false);
    const cycles = result.errors.filter((e) => e.message.startsWith("Circular dependency:"));
    expect(cycles).toHaveLength(2);
  });
});
