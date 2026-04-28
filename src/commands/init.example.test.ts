import { mkdtemp, readFile } from "fs/promises";
import fg from "fast-glob";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initCommand } from "./init.js";

describe("init --example", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes the same SKILL.md files as examples/basic/skills", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    const root = await mkdtemp(path.join(tmpdir(), "sklock-init-example-"));
    await initCommand({ root, example: true });

    const exampleRoot = path.resolve("examples/basic/skills");
    const relFiles = await fg("**/SKILL.md", { cwd: exampleRoot, onlyFiles: true });

    for (const rel of relFiles) {
      const [expected, actual] = await Promise.all([
        readFile(path.join(exampleRoot, rel), "utf-8"),
        readFile(path.join(root, rel), "utf-8"),
      ]);
      expect(actual).toBe(expected);
    }
  });
});
