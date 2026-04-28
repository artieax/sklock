import { scanSkills } from "../core/scanner.js";
import { buildTree, renderTree } from "../core/tree.js";
import { resolveWorkspaceRoot } from "./shared.js";

interface TreeOptions {
  root?: string;
  json?: boolean;
}

export async function treeCommand(options: TreeOptions): Promise<void> {
  const root = resolveWorkspaceRoot(options.root);
  const { skills, warnings } = await scanSkills(root);
  for (const w of warnings) {
    console.warn(w.message);
  }

  if (options.json) {
    console.log(JSON.stringify(buildTree(skills), null, 2));
  } else {
    console.log(renderTree(skills));
  }
}
