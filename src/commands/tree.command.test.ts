import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { treeCommand } from "./tree.js";

describe("treeCommand", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints a tree for a valid workspace", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-tree-cmd-"));
    await mkdir(path.join(root, "hello"), { recursive: true });
    await writeFile(
      path.join(root, "hello", "SKILL.md"),
      "---\nname: hello\ndescription: Hi\n---\n\n# Hello\n",
      "utf-8"
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await treeCommand({ root });
    expect(log.mock.calls[0]![0] as string).toContain("hello");
  });

  it("renders three levels of nested skills", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "sklock-tree-deep-"));
    await mkdir(path.join(root, "app", "skills", "mid", "skills", "leaf"), { recursive: true });
    await writeFile(
      path.join(root, "app", "SKILL.md"),
      "---\nname: app\ndescription: Root\n---\n\n# App\n",
      "utf-8"
    );
    await writeFile(
      path.join(root, "app", "skills", "mid", "SKILL.md"),
      "---\nname: mid\ndescription: Mid\n---\n\n# Mid\n",
      "utf-8"
    );
    await writeFile(
      path.join(root, "app", "skills", "mid", "skills", "leaf", "SKILL.md"),
      "---\nname: leaf\ndescription: Leaf\n---\n\n# Leaf\n",
      "utf-8"
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await treeCommand({ root });
    const out = log.mock.calls[0]![0] as string;
    expect(out).toContain("app");
    expect(out).toContain("mid");
    expect(out).toContain("leaf");
  });
});
