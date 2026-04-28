import { readFile } from "fs/promises";
import path from "path";
import { describe, expect, it } from "vitest";
import { generateLockfile } from "./core/lockfile.js";
import { scanSkills } from "./core/scanner.js";
import { validateSkills } from "./core/validator.js";

async function expectLockfileMatchesWorkspace(relativeSkillsDir: string): Promise<void> {
  const root = path.resolve(relativeSkillsDir);
  const { skills } = await scanSkills(root);
  expect(validateSkills(skills).valid).toBe(true);
  const generated = await generateLockfile(skills, root);
  const onDisk = JSON.parse(await readFile(path.join(root, "skill.lock"), "utf-8"));
  delete onDisk.generatedBy;
  expect(generated).toEqual(onDisk);
}

describe("committed example workspaces", () => {
  it("basic skill.lock matches the tree on disk", async () => {
    await expectLockfileMatchesWorkspace("examples/basic/skills");
  });

  it("coding skill.lock matches the tree on disk", async () => {
    await expectLockfileMatchesWorkspace("examples/coding/skills");
  });

  it("marketing skill.lock matches the tree on disk", async () => {
    await expectLockfileMatchesWorkspace("examples/marketing/skills");
  });
});
