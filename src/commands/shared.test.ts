import { mkdir, mkdtemp, realpath, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveWorkspaceRoot } from "./shared.js";

describe("resolveWorkspaceRoot", () => {
  const cwd = process.cwd();

  afterEach(() => {
    process.chdir(cwd);
    vi.restoreAllMocks();
  });

  it("warns when a skills/ directory is found by walking up from a subdirectory", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-ws-warn-"));
    const skills = path.join(root, "skills");
    await mkdir(path.join(skills, "a"), { recursive: true });
    await writeFile(
      path.join(skills, "a", "SKILL.md"),
      "---\nname: a\ndescription: x\n---\n\n# A\n",
      "utf-8"
    );
    const nested = path.join(root, "project", "app", "src");
    await mkdir(nested, { recursive: true });
    process.chdir(nested);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(realpath(resolveWorkspaceRoot())).resolves.toBe(await realpath(skills));
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/using skills workspace at /));
  });

  it("walks up from a nested skill directory to the workspace skills root", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-ws-"));
    const skills = path.join(root, "repo", "skills");
    await mkdir(path.join(skills, "hello"), { recursive: true });
    await writeFile(
      path.join(skills, "hello", "SKILL.md"),
      "---\nname: hello\ndescription: x\n---\n\n# H\n",
      "utf-8"
    );
    process.chdir(path.join(skills, "hello"));
    await expect(realpath(resolveWorkspaceRoot())).resolves.toBe(await realpath(skills));
  });

  it("does not treat a top-level skill's internal skills/ directory as the workspace root", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-ws-top-skill-"));
    const skills = path.join(root, "repo", "skills");
    await mkdir(path.join(skills, "parent", "skills", "child"), { recursive: true });
    await writeFile(
      path.join(skills, "parent", "SKILL.md"),
      "---\nname: parent\ndescription: parent\n---\n\n# Parent\n",
      "utf-8"
    );
    await writeFile(
      path.join(skills, "parent", "skills", "child", "SKILL.md"),
      "---\nname: child\ndescription: child\n---\n\n# Child\n",
      "utf-8"
    );

    process.chdir(path.join(skills, "parent"));
    await expect(realpath(resolveWorkspaceRoot())).resolves.toBe(await realpath(skills));
  });

  it("ignores nested internal skills directories when resolving the workspace root", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-ws-nested-"));
    const skills = path.join(root, "repo", "skills");
    await mkdir(path.join(skills, "parent", "skills", "child"), { recursive: true });
    await writeFile(
      path.join(skills, "parent", "SKILL.md"),
      "---\nname: parent\ndescription: parent\n---\n\n# Parent\n",
      "utf-8"
    );
    await writeFile(
      path.join(skills, "parent", "skills", "child", "SKILL.md"),
      "---\nname: child\ndescription: child\n---\n\n# Child\n",
      "utf-8"
    );

    process.chdir(path.join(skills, "parent", "skills"));
    await expect(realpath(resolveWorkspaceRoot())).resolves.toBe(await realpath(skills));
  });

  it("uses explicit --root when provided", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-ws2-"));
    const skills = path.join(root, "custom-skills");
    await mkdir(skills, { recursive: true });
    await expect(realpath(resolveWorkspaceRoot(skills))).resolves.toBe(await realpath(skills));
  });
});
