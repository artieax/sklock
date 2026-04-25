import { scanSkills } from "../core/scanner.js";
import { resolveSkills } from "../core/resolver.js";
import { renderTree } from "../core/tree.js";
import { resolveWorkspaceRoot } from "./shared.js";

interface TreeOptions {
  root?: string;
  json?: boolean;
}

export async function treeCommand(options: TreeOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const skills = await scanSkills(root);
  const resolved = resolveSkills(skills);

  if (options.json) {
    console.log(JSON.stringify(resolved, null, 2));
  } else {
    console.log(renderTree(resolved));
  }
}
