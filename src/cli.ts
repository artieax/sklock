#!/usr/bin/env node

import { cac } from "cac";
import { initCommand } from "./commands/init.js";
import { scanCommand } from "./commands/scan.js";
import { validateCommand } from "./commands/validate.js";
import { lockCommand } from "./commands/lock.js";
import { checkCommand } from "./commands/check.js";
import { treeCommand } from "./commands/tree.js";
import { graphCommand } from "./commands/graph.js";
import { whyCommand } from "./commands/why.js";
import { explainCommand } from "./commands/explain.js";
import { exportCommand } from "./commands/export.js";

const cli = cac("sklock");

cli
  .command("init", "Initialize a skills workspace")
  .option("--root <path>", "Path to skills directory")
  .option("--example", "Include example skill")
  .action(async (options) => {
    await initCommand(options);
  });

cli
  .command("scan", "Scan and list all discovered skills")
  .option("--root <path>", "Path to skills directory")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    await scanCommand(options);
  });

cli
  .command("validate", "Validate the skills workspace")
  .option("--root <path>", "Path to skills directory")
  .option("--json", "Output as JSON")
  .option("--verbose", "Verbose output")
  .option("--quiet", "Suppress output")
  .action(async (options) => {
    await validateCommand(options);
  });

cli
  .command("lock", "Generate skills/skill.lock")
  .option("--root <path>", "Path to skills directory")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    await lockCommand(options);
  });

cli
  .command("check", "Check lockfile is up to date")
  .option("--root <path>", "Path to skills directory")
  .option("--frozen", "Fail if lockfile is stale")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    await checkCommand(options);
  });

cli
  .command("tree", "Display skills as a tree")
  .option("--root <path>", "Path to skills directory")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    await treeCommand(options);
  });

cli
  .command("graph", "Render the skill dependency graph")
  .option("--root <path>", "Path to skills directory")
  .option("--mermaid", "Render as Mermaid diagram")
  .option("--format <format>", "Output format")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    await graphCommand(options);
  });

cli
  .command("why <skill-id>", "Explain why a skill is included")
  .option("--root <path>", "Path to skills directory")
  .action(async (skillId, options) => {
    await whyCommand(skillId, options);
  });

cli
  .command("explain <skill-id>", "Show details about a skill")
  .option("--root <path>", "Path to skills directory")
  .option("--json", "Output as JSON")
  .action(async (skillId, options) => {
    await explainCommand(skillId, options);
  });

cli
  .command("export", "Export skill graph data")
  .option("--root <path>", "Path to skills directory")
  .option("--output <path>", "Output file path")
  .option("--format <format>", "Output format (json|yaml|mermaid)")
  .action(async (options) => {
    await exportCommand(options);
  });

cli.help();
cli.version("0.1.0");
cli.parse();
