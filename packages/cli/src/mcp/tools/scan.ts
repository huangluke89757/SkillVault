import path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  parseSource,
  getSourceLabel,
} from "../../core/source-parser.js";
import { cloneRepo, cleanupTempDir } from "../../core/git.js";
import { discoverSkills, filterSkills } from "../../core/skill-discovery.js";
import { dirExists } from "../../utils/fs.js";
import {
  SCANNERS,
  detectAvailableScanners,
  detectInsideScanner,
  filterInsideScanner,
  buildScanPrompt,
  invokeScanner,
  detectCreditsExhausted,
} from "../../core/scanners.js";
import type { ScannerConfig, ScannerType } from "../../types.js";
import { mcpSuccess, mcpError } from "../helpers.js";

export function registerScan(server: McpServer): void {
  server.tool(
    "skillvault_scan",
    "Security-scan AI agent skills using an available coding agent.",
    {
      source: z
        .string()
        .describe(
          "Skill source to scan: @username/slug (SkillVault), owner/repo (GitHub), owner/repo@skill, or a local path (./path).",
        ),
      scanner: z
        .string()
        .optional()
        .describe(
          "Force a specific scanner (e.g. 'claude-code', 'codex-cli', 'aider'). If omitted, the first available scanner is used.",
        ),
      timeout: z
        .number()
        .default(120)
        .describe("Scanner timeout in seconds (default 120)."),
    },
    async ({ source, scanner: scannerName, timeout }) => {
      let tmpDir: string | undefined;

      try {
        // 1. Parse source and resolve skill directory
        const parsed = parseSource(source);
        const sourceLabel = getSourceLabel(parsed);
        let skillDir: string;

        if (parsed.type === "local") {
          if (!(await dirExists(parsed.localPath!))) {
            return mcpError(
              `Local path does not exist: ${parsed.localPath}`,
              "LOCAL_PATH_NOT_FOUND",
            );
          }
          skillDir = parsed.localPath!;
        } else {
          tmpDir = await cloneRepo(parsed);
          skillDir = tmpDir;
        }

        // 2. Discover and filter skills
        let skills = await discoverSkills(skillDir, parsed.subpath);
        if (skills.length === 0) {
          return mcpError(
            `No skills found in ${sourceLabel}.`,
            "NO_SKILLS_FOUND",
          );
        }

        if (parsed.skillFilter) {
          skills = filterSkills(skills, parsed.skillFilter);
          if (skills.length === 0) {
            return mcpError(
              `Skill "${parsed.skillFilter}" not found in ${sourceLabel}.`,
              "SKILL_NOT_FOUND",
            );
          }
        }

        // 3. Detect available scanners
        const insideScanner = detectInsideScanner();
        const available = await detectAvailableScanners();
        const filtered = filterInsideScanner(available, insideScanner);

        if (filtered.length === 0 && insideScanner) {
          return mcpError(
            `You are running inside ${SCANNERS[insideScanner].displayName}, which is the only available scanner. Cannot scan recursively.`,
            "SCANNER_INSIDE_ONLY",
          );
        }

        if (filtered.length === 0) {
          return mcpError(
            "No coding agents available for scanning. Install one of: claude-code, codex-cli, opencode, goose, aider.",
            "NO_SCANNERS",
          );
        }

        // 6. Select scanner
        let selectedScanner: ScannerConfig;

        if (scannerName) {
          const entry = Object.values(SCANNERS).find(
            (s) => s.name === scannerName,
          );
          if (!entry) {
            return mcpError(
              `Unknown scanner: "${scannerName}". Available: ${Object.keys(SCANNERS).join(", ")}`,
              "UNKNOWN_SCANNER",
            );
          }
          if (!filtered.find((s) => s.name === entry.name)) {
            return mcpError(
              `"${scannerName}" is not available on this system.`,
              "SCANNER_NOT_AVAILABLE",
            );
          }
          selectedScanner = entry;
        } else {
          selectedScanner = filtered[0];
        }

        // 7. Build prompt and invoke scanner
        const prompt = buildScanPrompt(
          skills.map((s) => ({
            name: s.name,
            content: s.content,
            relativePath: path.relative(skillDir, s.filePath),
          })),
        );

        const startTime = Date.now();

        const result = await invokeScanner({
          scanner: selectedScanner,
          prompt,
          cwd: skillDir,
          timeoutMs: timeout * 1000,
        });

        const durationMs = Date.now() - startTime;

        // 8. Handle timeout
        if (result.timedOut) {
          return mcpError(
            `${selectedScanner.displayName} timed out after ${timeout}s. Try increasing --timeout or using a different scanner.`,
            "SCANNER_TIMEOUT",
          );
        }

        // 9. Handle credits exhausted
        if (detectCreditsExhausted(result.stderr, result.stdout)) {
          return mcpError(
            `${selectedScanner.displayName} ran out of API credits. Try a different scanner.`,
            "CREDITS_EXHAUSTED",
          );
        }

        // 10. Handle crash
        if (result.exitCode !== 0 && result.exitCode !== null) {
          return mcpError(
            `${selectedScanner.displayName} exited with code ${result.exitCode}. ${result.stderr.slice(0, 500)}`,
            "SCANNER_CRASH",
          );
        }

        // 11. Parse report
        const report = selectedScanner.parseOutput(result.stdout, result.stderr);

        if (!report) {
          return mcpSuccess({
            scanner: selectedScanner.name,
            report: null,
            parseFailed: true,
            rawOutput: result.stdout.slice(0, 2000),
            durationMs,
          });
        }

        // 12. Return result
        return mcpSuccess({
          scanner: selectedScanner.name,
          report: {
            risk: report.risk,
            summary: report.summary,
            findings: report.findings,
          },
          durationMs,
        });
      } catch (err: unknown) {
        return mcpError(
          err instanceof Error ? err.message : "Scan failed",
          "SCAN_FAILED",
        );
      } finally {
        if (tmpDir) await cleanupTempDir(tmpDir);
      }
    },
  );
}
