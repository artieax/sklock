import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { graphCommand } from "./graph.js";

async function makeWorkspaceWithMissingDependency(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "sklock-graph-"));
  const skillDir = path.join(root, "hello");
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    "---\nname: hello\ndescription: Hello\nrequires:\n  - missing\n---\n\n# Hello\n",
    "utf-8"
  );
  return root;
}

describe("graphCommand", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exits non-zero instead of omitting missing dependencies", async () => {
    const root = await makeWorkspaceWithMissingDependency();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });

    await expect(graphCommand({ root })).rejects.toThrow("exit:2");
    const messages = error.mock.calls.map((c) => String(c[0]));
    expect(
      messages.some(
        (m) => m.includes("[hello]") && m.includes("Missing required skill: missing") && m.includes("SKILL.md")
      )
    ).toBe(true);
  });
});
