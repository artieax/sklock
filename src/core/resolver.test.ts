import { describe, expect, it } from "vitest";
import type { DiscoveredSkill } from "./scanner.js";
import { resolveSkills } from "./resolver.js";

function skill(partial: Partial<DiscoveredSkill> & Pick<DiscoveredSkill, "id" | "path" | "skillMdPath">): DiscoveredSkill {
  return {
    name: partial.id,
    requires: [],
    tags: [],
    ...partial,
  };
}

describe("resolveSkills", () => {
  it("maps requires ids to discovered skills", () => {
    const alpha = skill({
      id: "alpha",
      path: "/a",
      skillMdPath: "/a/SKILL.md",
      requires: ["beta"],
    });
    const beta = skill({ id: "beta", path: "/b", skillMdPath: "/b/SKILL.md" });
    const resolved = resolveSkills([alpha, beta]);
    expect(resolved[0]?.resolvedRequires).toEqual([beta]);
  });
});
