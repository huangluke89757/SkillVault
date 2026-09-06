import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  parseSource,
  getSourceLabel,
} from "../core/source-parser.js";
import { cloneRepo, cleanupTempDir, GitCloneError } from "../core/git.js";
import { discoverSkills, filterSkills } from "../core/skill-discovery.js";
import { confirmAction } from "../ui/prompts.js";
import { dirExists } from "../utils/fs.js";
import { fmt } from "../ui/format.js";
import {
  SkillVaultError,
  NoSkillsInRepoError,
  NoScannersAvailableError,
  ScannerInsideOnlyError,
  ScannerTimeoutError,
  ScannerCrashError,
} from "../utils/errors.js";
import {
  SCANNERS,
  detectAvailableScanners,
  detectInsideScanner,
  filterInsideScanner,
  buildScanPrompt,
  invokeScanner,
  detectCreditsExhausted,
} from "../core/scanners.js";
import {
  ScannerConfig,
  ScannerType,
  SeverityLevel,
  RiskAssessment,
} from "../types.js";

interface ScanOptions {
  scanner?: string;
  yes: boolean;
  timeout: number;
  raw: boolean;
  noShare: boolean;
}

export async function runScan(args: string[]): Promise<void> {
  const { source, options } = parseScanOptions(args);

  if (!source) {
    console.error(fmt.error("Missing source. Usage: skillvault scan <source>"));
    process.exit(1);
  }

  const parsed = parseSource(source);
  const sourceLabel = getSourceLabel(parsed);

  p.intro(fmt.bold(`Security scan skills from ${sourceLabel}`));

  let tmpDir: string | undefined;

  try {
    let skillDir: string;

    if (parsed.type === "local") {
      if (!(await dirExists(parsed.localPath!))) {
        throw new SkillVaultError(
          `Local path does not exist: ${parsed.localPath}`,
          "LOCAL_PATH_NOT_FOUND",
        );
      }
      skillDir = parsed.localPath!;
    } else {
      const spinner = p.spinner();
      spinner.start(`Cloning ${sourceLabel}...`);
      tmpDir = await cloneRepo(parsed);
      spinner.stop("Repository cloned.");
      skillDir = tmpDir;
    }

    // Discover skills
    let skills = await discoverSkills(skillDir, parsed.subpath);
    if (skills.length === 0) {
      throw new NoSkillsInRepoError(sourceLabel);
    }

    // Apply skill filter
    if (parsed.skillFilter) {
      skills = filterSkills(skills, parsed.skillFilter);
      if (skills.length === 0) {
        throw new SkillVaultError(
          `Skill "${parsed.skillFilter}" not found`,
          "SKILL_NOT_FOUND",
        );
      }
    }

    p.log.info(
      `Found ${skills.length} skill(s): ${skills.map((s) => fmt.skillName(s.name)).join(", ")}`,
    );

    // Large skill warning
    const totalSize = skills.reduce((sum, s) => sum + s.content.length, 0);
    if (totalSize > 50000) {
      p.log.warn(
        `Total skill content is ${Math.round(totalSize / 1000)}KB. This may use significant API credits.`,
      );
      if (!options.yes) {
        const proceed = await confirmAction("Continue with scan?");
        if (!proceed) {
          p.outro("Scan cancelled.");
          return;
        }
      }
    }

    // Scanner detection
    const insideScanner = detectInsideScanner();
    const insideScannerDisplayName = insideScanner
      ? SCANNERS[insideScanner].displayName
      : "";

    if (insideScanner) {
      p.log.info(
        fmt.dim(
          `Running inside ${insideScannerDisplayName} (excluded from selection)`,
        ),
      );
    }

    const available = await detectAvailableScanners();
    const filtered = filterInsideScanner(available, insideScanner);

    if (filtered.length === 0 && insideScanner) {
      throw new ScannerInsideOnlyError(insideScannerDisplayName);
    }
    if (filtered.length === 0) {
      throw new NoScannersAvailableError();
    }

    // Scanner selection
    let selectedScanner: ScannerConfig;

    if (options.scanner) {
      const scannerEntry = Object.values(SCANNERS).find(
        (s) => s.name === options.scanner,
      );
      if (!scannerEntry) {
        throw new SkillVaultError(
          `Unknown agent: "${options.scanner}". Available: ${Object.keys(SCANNERS).join(", ")}`,
          "UNKNOWN_SCANNER",
        );
      }
      if (insideScanner && scannerEntry.name === insideScanner) {
        p.log.warn(
          `You are currently running inside ${insideScannerDisplayName}. Invoking it recursively may cause issues.`,
        );
        if (!options.yes) {
          const proceed = await confirmAction("Continue anyway?");
          if (!proceed) {
            p.outro("Scan cancelled.");
            return;
          }
        }
      }
      if (!filtered.find((s) => s.name === scannerEntry.name)) {
        throw new SkillVaultError(
          `"${options.scanner}" is not available on this system.`,
          "SCANNER_NOT_AVAILABLE",
        );
      }
      selectedScanner = scannerEntry;
    } else if (options.yes || filtered.length === 1) {
      selectedScanner = filtered[0];
    } else {
      const selected = await p.select({
        message: "Select a coding agent to run the scan:",
        options: filtered.map((s) => ({
          value: s.name,
          label: s.displayName,
          hint:
            s.name === "claude-code"
              ? "(recommended - read-only mode)"
              : undefined,
        })),
      });

      if (p.isCancel(selected)) {
        p.cancel("Scan cancelled.");
        process.exit(0);
      }

      selectedScanner = SCANNERS[selected as ScannerType];
    }

    p.log.info(
      fmt.dim(
        `Using ${selectedScanner.displayName}'s default model. To change it, update your ${selectedScanner.displayName} configuration.`,
      ),
    );

    // Build prompt and invoke scanner
    const prompt = buildScanPrompt(
      skills.map((s) => ({
        name: s.name,
        content: s.content,
        relativePath: path.relative(skillDir, s.filePath),
      })),
    );

    const spin = p.spinner();
    spin.start(`Scanning with ${selectedScanner.displayName}...`);
    const startTime = Date.now();

    const result = await invokeScanner({
      scanner: selectedScanner,
      prompt,
      cwd: skillDir,
      timeoutMs: options.timeout * 1000,
    });

    spin.stop("Scan complete.");
    const durationMs = Date.now() - startTime;

    // Handle failures
    if (result.timedOut) {
      throw new ScannerTimeoutError(
        selectedScanner.displayName,
        options.timeout,
      );
    }

    if (detectCreditsExhausted(result.stderr, result.stdout)) {
      throw new SkillVaultError(
        `${selectedScanner.displayName} ran out of API credits. Try a different agent with --scanner.`,
        "CREDITS_EXHAUSTED",
      );
    }

    if (result.exitCode !== 0 && result.exitCode !== null) {
      throw new ScannerCrashError(
        selectedScanner.displayName,
        result.exitCode,
        result.stderr,
      );
    }

    // Parse output
    const report = selectedScanner.parseOutput(result.stdout, result.stderr);
    let parseFailed = false;

    if (!report) {
      parseFailed = true;
      p.log.warn("Could not parse structured output.");
      if (result.stdout) {
        p.log.message(fmt.dim(result.stdout.slice(0, 1000)));
      }
    }

    // Display report
    if (!options.raw && report) {
      p.log.message("");
      p.log.message(fmt.bold(`Scanned with ${selectedScanner.displayName}`));

      // Risk badge
      const riskBadge = formatRiskBadge(report.risk);
      p.log.message(`Risk: ${riskBadge}`);

      // Summary
      if (report.summary) {
        p.log.message("");
        p.log.message(report.summary);
      }

      // Findings grouped by severity
      if (report.findings.length > 0) {
        p.log.message("");
        p.log.message(fmt.bold("Findings:"));

        const severityOrder: SeverityLevel[] = [
          "critical",
          "high",
          "medium",
          "low",
          "info",
        ];

        for (const severity of severityOrder) {
          const group = report.findings.filter(
            (f) => f.severity === severity,
          );
          if (group.length === 0) continue;

          for (const finding of group) {
            const sevLabel = formatSeverityLabel(finding.severity);
            const location = finding.line
              ? `${finding.file}:${finding.line}`
              : finding.file;
            p.log.message(
              `  ${sevLabel} ${location} [${finding.category}] ${finding.description}`,
            );
          }
        }
      } else {
        p.log.message("");
        p.log.success("No security issues found.");
      }
    }

    if (options.raw) {
      console.log(result.stdout);
    }

    p.outro(
      report
        ? fmt.success(`Scan complete — Risk: ${report.risk}`)
        : fmt.dim("Scan complete — could not determine risk level"),
    );
  } catch (err) {
    if (err instanceof GitCloneError) {
      if (err.isAuth) {
        p.log.error(
          "Authentication failed. For private repos, set GITHUB_TOKEN.",
        );
      } else {
        p.log.error(err.message);
      }
    } else if (err instanceof SkillVaultError) {
      p.log.error(err.message);
    } else if (err instanceof Error) {
      p.log.error(err.message);
    }
    process.exit(1);
  } finally {
    if (tmpDir) await cleanupTempDir(tmpDir);
  }
}

function parseScanOptions(args: string[]): {
  source: string | undefined;
  options: ScanOptions;
} {
  const options: ScanOptions = {
    yes: false,
    timeout: 120,
    raw: false,
    noShare: false,
  };
  let source: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-y" || arg === "--yes") options.yes = true;
    else if (arg === "--raw") options.raw = true;
    else if (arg === "--no-share") options.noShare = true;
    else if ((arg === "-s" || arg === "--scanner") && args[i + 1]) {
      options.scanner = args[++i];
    } else if (arg === "--timeout" && args[i + 1]) {
      options.timeout = parseInt(args[++i], 10) || 120;
    } else if (!arg.startsWith("-")) {
      source = arg;
    }
  }

  return { source, options };
}

function formatRiskBadge(risk: RiskAssessment): string {
  switch (risk) {
    case "CLEAN":
      return pc.green("CLEAN");
    case "LOW":
      return pc.green("LOW");
    case "MEDIUM":
      return pc.yellow(pc.bold("MEDIUM"));
    case "HIGH":
      return pc.red(pc.bold("HIGH"));
    case "CRITICAL":
      return pc.bgRed(pc.white(pc.bold("CRITICAL")));
  }
}

function formatSeverityLabel(severity: SeverityLevel): string {
  switch (severity) {
    case "critical":
      return pc.bgRed(pc.white(pc.bold("CRITICAL")));
    case "high":
      return pc.red(pc.bold("HIGH"));
    case "medium":
      return pc.yellow(pc.bold("MEDIUM"));
    case "low":
      return pc.green("LOW");
    case "info":
      return pc.dim("INFO");
  }
}
