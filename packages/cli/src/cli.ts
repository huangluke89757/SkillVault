import * as p from "@clack/prompts";
import pc from "picocolors";
import { VERSION } from "./constants.js";
import { runAdd } from "./commands/add.js";
import { runRemove } from "./commands/remove.js";
import { runList } from "./commands/list.js";
import { runUpdate } from "./commands/update.js";
import { runSync } from "./commands/sync.js";
import { runScan } from "./commands/scan.js";
import { runSetup } from "./commands/setup.js";

// "SKILLS" in dark silver (dim), "GATE" in bright white (bold)
const s = (t: string) => pc.dim(t);       // dark silver
const g = (t: string) => pc.bold(pc.white(t)); // glowy white

const LOGO = `
${s("███████╗██╗  ██╗██╗██╗     ██╗     ███████╗")} ${g("██████╗  █████╗ ████████╗███████╗")}
${s("██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝")}${g("██╔════╝ ██╔══██╗╚══██╔══╝██╔════╝")}
${s("███████╗█████╔╝ ██║██║     ██║     ███████╗")}${g("██║  ███╗███████║   ██║   █████╗")}
${s("╚════██║██╔═██╗ ██║██║     ██║     ╚════██║")}${g("██║   ██║██╔══██║   ██║   ██╔══╝")}
${s("███████║██║  ██╗██║███████╗███████╗███████║")}${g("╚██████╔╝██║  ██║   ██║   ███████╗")}
${s("╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝")} ${g("╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝")}
`;

function printLogo(): void {
  console.log(LOGO);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const restArgs = args.slice(1);

  // MCP server mode — must run before logo/telemetry
  if (command === "mcp") {
    const { startMcpServer } = await import("./mcp/server.js");
    await startMcpServer();
    return;
  }

  // Show logo for interactive commands
  if (command && !command.startsWith("-")) {
    printLogo();
  }

  switch (command) {
    case "add":
    case "a":
    case "install":
    case "i":
      await runAdd(restArgs);
      break;

    case "remove":
    case "rm":
    case "r":
    case "uninstall":
      await runRemove(restArgs);
      break;

    case "list":
    case "ls":
      await runList(restArgs);
      break;

    case "update":
    case "up":
      await runUpdate(restArgs);
      break;

    case "sync":
      await runSync(restArgs);
      break;

    case "scan":
    case "audit":
      await runScan(restArgs);
      break;

    case "setup":
      await runSetup(restArgs);
      break;

    case "tui": {
      const { execFileSync } = await import("node:child_process");
      try {
        execFileSync("skillvault-tui", [], { stdio: "inherit" });
      } catch {
        console.error(pc.red("TUI not found. Install with: npm install -g @skillvault/tui"));
        process.exit(1);
      }
      break;
    }

    case "--version":
    case "-v":
      console.log(`skillvault v${VERSION}`);
      break;

    case "--help":
    case "-h":
    case undefined:
      printLogo();
      printHelp();
      break;

    default:
      console.error(pc.red(`Unknown command: ${command}`));
      console.error(`Run ${pc.bold("skillvault --help")} for usage.`);
      process.exit(1);
  }
}

function printHelp(): void {
  const DIM = pc.dim;
  const BOLD = pc.bold;

  console.log();
  console.log(`  ${BOLD("skillvault")} ${DIM(`v${VERSION}`)}`);
  console.log(`  ${DIM("Install and manage AI agent skills")}`);
  console.log();
  console.log(`  ${BOLD("Usage:")}`);
  console.log(`    skillvault ${DIM("<command>")} ${DIM("[options]")}`);
  console.log();
  console.log(`  ${BOLD("Commands:")}`);
  console.log(
    `    add ${DIM("<source>")}     Install skills from a GitHub repo or local path`,
  );
  console.log(`    remove ${DIM("[name]")}    Uninstall skills`);
  console.log(`    list               Show installed skills`);
  console.log(`    update ${DIM("[name]")}    Check and apply updates`);
  console.log(`    sync               Sync skills from node_modules`);
  console.log(
    `    scan ${DIM("<source>")}     Security-scan skills before installing`,
  );
  console.log(`    mcp                Run as MCP server (stdio transport)`);
  console.log(`    setup              Configure MCP for AI tools`);
  console.log(`    tui                Launch terminal UI (requires @skillvault/tui)`);
  console.log();
  console.log(`  ${BOLD("Examples:")}`);
  console.log(`    skillvault add vercel-labs/agent-skills`);
  console.log(`    skillvault add vercel-labs/agent-skills@my-skill`);
  console.log(`    skillvault add https://github.com/owner/repo`);
  console.log(`    skillvault add ./local/skills`);
  console.log(`    skillvault scan owner/repo              ${DIM("# scan a GitHub repo")}`);
  console.log(`    skillvault scan owner/repo@skill-name   ${DIM("# scan a specific skill in a repo")}`);
  console.log(`    skillvault scan ./local/skill            ${DIM("# scan a local path")}`);
  console.log(`    skillvault remove my-skill`);
  console.log(`    skillvault list -g`);
  console.log(`    skillvault update`);
  console.log(`    skillvault sync`);
  console.log();
  console.log(`  ${BOLD("Options:")}`);
  console.log(
    `    -g, --global       Use global scope (~/.agents/skills/)`,
  );
  console.log(`    -y, --yes          Skip confirmation prompts`);
  console.log(`    -a, --agent <id>   Target specific agent(s)`);
  console.log(`    --all              Select all skills/agents`);
  console.log(`    --copy             Use copy mode instead of symlink`);
  console.log(`    -s, --scanner      Force a specific coding agent ${DIM("(scan only)")}`);
  console.log(`    --timeout <sec>    Agent timeout, default 120 ${DIM("(scan only)")}`);
  console.log(`    --raw              Show raw agent output ${DIM("(scan only)")}`);
  console.log(`    --no-share         Don't share results with community ${DIM("(scan only)")}`);
  console.log(`    -v, --version      Show version`);
  console.log(`    -h, --help         Show this help`);
  console.log();
}

main()
  .catch((err) => {
    console.error(pc.red(err.message || String(err)));
    process.exit(1);
  });
