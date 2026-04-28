import { mkdir, mkdtemp, readFile, realpath, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initCommand } from "./init.js";

describe("initCommand", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refuses --example when a target SKILL.md already exists", async () => {
    const root = await realpath(await mkdtemp(path.join(tmpdir(), "sklock-init-")));
    await mkdir(path.join(root, "hello"), { recursive: true });
    await writeFile(path.join(root, "hello", "SKILL.md"), "exists\n", "utf-8");

    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });

    await expect(initCommand({ root, example: true })).rejects.toThrow("exit:1");
    await expect(readFile(path.join(root, "hello", "SKILL.md"), "utf-8")).resolves.toBe("exists\n");
    await expect(readFile(path.join(root, "citation-formatter", "SKILL.md"), "utf-8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("refuses when --root points at an existing file", async () => {
    const root = await realpath(await mkdtemp(path.join(tmpdir(), "sklock-init-file-")));
    const rootFile = path.join(root, "skills");
    await writeFile(rootFile, "", "utf-8");

    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });

    await expect(initCommand({ root: rootFile })).rejects.toThrow("exit:1");
  });
});
