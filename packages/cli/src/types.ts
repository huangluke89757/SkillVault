// ---------- Agent Types ----------

export type AgentType =
  | "amp"
  | "astrbot"
  | "catpaw"
  | "claude-code"
  | "cline"
  | "codearts"
  | "codebuddy"
  | "codex-cli"
  | "comate"
  | "deepseek-harness"
  | "droid-cli"
  | "ob-1"
  | "continue"
  | "cursor"
  | "gemini-cli"
  | "github-copilot"
  | "goose"
  | "hermes-agent"
  | "iflow-cli"
  | "junie"
  | "kiro"
  | "kilo-code"
  | "lingma"
  | "minimax-code"
  | "mimo-code"
  | "opencode"
  | "openclaw"
  | "pear-ai"
  | "pi"
  | "kimi-code"
  | "qoder"
  | "qoder-cn"
  | "qoderwork"
  | "qwen-code"
  | "roo-code"
  | "trae"
  | "trae-cn"
  | "traecode-cli"
  | "workbuddy"
  | "windsurf"
  | "zcode"
  | "zed"
  | "universal";

export interface AgentConfig {
  name: AgentType;
  displayName: string;
  skillsDir: string;
  globalSkillsDir: string;
  detectInstalled: () => Promise<boolean>;
  showInUniversalList?: boolean;
}

// ---------- Skill Types ----------

export interface Skill {
  name: string;
  description: string;
  filePath: string;
  content: string;
  plugin?: string;
  metadata?: Record<string, unknown>;
}

// ---------- Source Parsing ----------

export type SourceType = "github" | "local";

export interface ParsedSource {
  type: SourceType;
  url: string;
  owner: string;
  repo: string;
  subpath?: string;
  ref?: string;
  skillFilter?: string;
  localPath?: string;
}

// ---------- Lock File ----------

export interface SkillLockEntry {
  source: string;
  sourceType: SourceType;
  originalUrl: string;
  skillFolderHash: string;
  installedAt: string;
  updatedAt: string;
}

export interface SkillLockFile {
  version: number;
  skills: Record<string, SkillLockEntry>;
  lastSelectedAgents?: AgentType[];
}

// ---------- Plugin Manifest Types ----------

export interface PluginManifest {
  name: string;
  skills?: string[];
  source?: string;
  description?: string;
}

export interface MarketplaceManifest {
  name?: string;
  plugins: PluginManifest[];
}

// ---------- Install Types ----------

export type InstallScope = "project" | "global";
export type InstallMethod = "symlink" | "copy";

export interface InstallResult {
  skillName: string;
  agent: AgentType;
  success: boolean;
  path: string;
  symlinkFailed?: boolean;
  error?: string;
}

// ---------- Skill Parsing / Validation Types ----------

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ParsedSkill {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string;
  content: string;
}

export interface SizeCheckResult {
  valid: boolean;
  totalSize: number;
  files: Array<{ name: string; size: number }>;
  errors: string[];
}

export interface DirectoryValidationResult {
  valid: boolean;
  skillName: string | null;
  errors: string[];
}

// ---------- Scan Types ----------

export type ScannerType = "claude-code" | "codex-cli" | "opencode" | "goose" | "aider";

export type SeverityLevel = "info" | "low" | "medium" | "high" | "critical";

export type RiskAssessment = "CLEAN" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ScannerConfig {
  name: ScannerType;
  displayName: string;
  binary: string;
  insideEnvVars: string[];
  buildArgs: (prompt: string) => string[];
  parseOutput: (stdout: string, stderr: string) => ScanReport | null;
}

export interface ScanFinding {
  file: string;
  line?: number;
  severity: SeverityLevel;
  category: string;
  description: string;
}

export interface ScanReport {
  risk: RiskAssessment;
  findings: ScanFinding[];
  summary: string;
  raw?: string;
}

export interface InvocationResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

export interface ScanSummary {
  sourceId: string;
  totalScans: number;
  riskBreakdown: Record<RiskAssessment, number>;
  topFindings: { category: string; count: number; avgSeverity: string }[];
  lastScannedAt: string | null;
}
