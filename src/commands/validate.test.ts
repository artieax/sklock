import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateCommand } from "./validate.js";

describe("validateCommand", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exits 2 when validation fails", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-val-"));
    await mkdir(path.join(root, "hello"), { recursive: true });
    await writeFile(
      path.join(root, "hello", "SKILL.md"),
      "---\nname: hello\ndescription: Hi\nrequires:\n  - missing\n---\n\n# Hello\n",
      "utf-8"
    );

    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });

    await expect(validateCommand({ root })).rejects.toThrow("exit:2");
  });

  it("prints success when the workspace is valid", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-val-"));
    await mkdir(path.join(root, "hello"), { recursive: true });
    await writeFile(
      path.join(root, "hello", "SKILL.md"),
      "---\nname: hello\ndescription: Hi\n---\n\n# Hello\n",
      "utf-8"
    );

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await validateCommand({ root });
    expect(log).toHaveBeenCalledWith("✓ All 1 skill(s) are valid.");
  });

  it("includes scan warnings in --json output", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-val-json-"));
    await mkdir(path.join(root, "hello"), { recursive: true });
    await writeFile(
      path.join(root, "hello", "SKILL.md"),
      "---\nname: hello\ndescription: Hi\n---\n\n# Hello\n",
      "utf-8"
    );

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await validateCommand({ root, json: true });
    const payload = JSON.parse(log.mock.calls[0]![0] as string);
    expect(payload.valid).toBe(true);
    expect(payload.warnings).toEqual([]);
  });
});
