import { readFile } from "fs/promises";
import { parse } from "yaml";
import path from "path";
import { WorkspaceSchema, type Workspace } from "../schema/workspace.schema.js";

export async function loadWorkspace(root: string): Promise<Workspace> {
  const manifestPath = path.join(root, "skill-workspace.yml");
  try {
    const content = await readFile(manifestPath, "utf-8");
    const raw = parse(content);
    return WorkspaceSchema.parse(raw);
  } catch {
    return WorkspaceSchema.parse({});
  }
}
