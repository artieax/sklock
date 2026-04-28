import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { explainCommand } from "./explain.js";

describe("explainCommand", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints details for a known skill", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-explain-"));
    await mkdir(path.join(root, "hello"), { recursive: true });
    await writeFile(
      path.join(root, "hello", "SKILL.md"),
      "---\nname: hello\ndescription: Hi there\nversion: \"1.0.0\"\n---\n\n# Hello\n",
      "utf-8"
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await explainCommand("hello", { root });
    const out = log.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(out).toContain("hello");
    expect(out).toContain("Hi there");
  });
});
