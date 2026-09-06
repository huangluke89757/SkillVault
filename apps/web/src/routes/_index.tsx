import { Navbar } from "~/components/navbar";
import { useReveal } from "~/components/use-reveal";

const GITHUB_URL = "https://github.com/huangluke89757/SkillVault";

const PAIN_POINTS = [
	{
		label: "REPETITION",
		title: "Install once? Try N times",
		description:
			"The same skill, manually copied into every agent's directory. Update it once and every copy drifts out of sync.",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
				<path d="M17 1l4 4-4 4" />
				<path d="M3 11V9a4 4 0 0 1 4-4h14" />
				<path d="M7 23l-4-4 4-4" />
				<path d="M21 13v2a4 4 0 0 1-4 4H3" />
			</svg>
		),
	},
	{
		label: "FRAGMENTATION",
		title: "Every agent, a different layout",
		description:
			".claude/skills, .cursor, .codex — each agent expects its own structure. Keeping them aligned by hand is a losing game.",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
				<rect x="3" y="3" width="7" height="7" />
				<rect x="14" y="3" width="7" height="7" />
				<rect x="3" y="14" width="7" height="7" />
				<path d="M14 17.5h7M17.5 14v7" />
			</svg>
		),
	},
	{
		label: "LOCK-IN",
		title: "Skills scattered everywhere",
		description:
			"Skills end up scattered across dotfiles and random folders. Migrating machines or sharing setups becomes a chore.",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
				<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
				<path d="M3.27 6.96L12 12.01l8.73-5.05" />
				<line x1="12" y1="22.08" x2="12" y2="12" />
			</svg>
		),
	},
];

const HOW_IT_WORKS = [
	{
		step: "01",
		title: "One master vault",
		desc: "Every skill lives exactly once in ~/.agents/skills — your single source of truth, versioned and backed up like any other folder.",
	},
	{
		step: "02",
		title: "Symlink adapters",
		desc: "SkillVault links each skill into the directory your agent actually reads — symlinks on macOS/Linux, junctions on Windows. No copies, no drift.",
	},
	{
		step: "03",
		title: "Sync 40+ agents",
		desc: "Enable an agent with one click. Claude Code, Cursor, Windsurf, Codex CLI and more all read from the same vault, always up to date.",
	},
];

const AGENTS = [
	"Claude Code",
	"Codex CLI",
	"Cursor",
	"Windsurf",
	"Gemini CLI",
	"Cline",
	"Roo Code",
	"Kilo Code",
	"Amp",
	"Copilot CLI",
	"Goose",
	"OpenCode",
	"Crush",
	"Aider",
	"Continue",
	"Trae",
];

const FEATURES = [
	{
		label: "SCAN",
		title: "Local skill scanning",
		description:
			"Scan your machine for skills already installed across agents. SkillVault maps every directory and shows you what lives where.",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
				<circle cx="11" cy="11" r="8" />
				<line x1="21" y1="21" x2="16.65" y2="16.65" />
			</svg>
		),
	},
	{
		label: "EDITOR",
		title: "SKILL.md editor",
		description:
			"Edit any skill with a CodeMirror-powered markdown editor. Syntax highlighting, live preview, and saves straight to the vault.",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
				<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
				<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
			</svg>
		),
	},
	{
		label: "MIGRATE",
		title: ".skillvault bundles",
		description:
			"Export your entire vault as a .skillvault migration bundle and import it on another machine. Moving setups takes minutes, not evenings.",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="7 10 12 15 17 10" />
				<line x1="12" y1="15" x2="12" y2="3" />
			</svg>
		),
	},
	{
		label: "UPDATE",
		title: "Lockfile-based updates",
		description:
			"Track where each skill came from with a lockfile. Update skills from upstream, or pin them to the exact version you trust.",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
				<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
				<path d="M7 11V7a5 5 0 0 1 10 0v4" />
			</svg>
		),
	},
	{
		label: "PRIVATE",
		title: "No account, no cloud",
		description:
			"SkillVault is fully local. No sign-up, no telemetry, no server round-trips. Your skills never leave your machine.",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
				<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
				<circle cx="12" cy="7" r="4" />
			</svg>
		),
	},
	{
		label: "THEME",
		title: "Morandi light & dark",
		description:
			"A calm, low-saturation Morandi palette in both light and dark themes. Easy on the eyes during long editing sessions.",
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
				<circle cx="12" cy="12" r="10" />
				<path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor" stroke="none" />
			</svg>
		),
	},
];

const DOWNLOADS = [
	{
		platform: "Windows",
		hint: "Windows 10 / 11 · .exe installer",
		icon: (
			<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
				<path d="M0 3.449L9.75 2.1v9.451H0m0-8.1v9.451h9.75V21.9L0 20.55M10.875 1.899L24 0v11.4H10.875m0 11.7V12.6H24V24z" />
			</svg>
		),
	},
	{
		platform: "macOS",
		hint: "macOS 12+ · Apple Silicon & Intel",
		icon: (
			<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
				<path d="M17.05 20.28c-.98.95-2.05.86-3.08.41-1.09-.47-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.41C2.79 14.25 3.51 5.16 9.05 4.89c1.35.07 2.29.74 3.08.8.79-.16 2.29-.9 3.79-.77 1.75.14 3.06.83 3.97 2.08-3.64 2.18-2.77 6.98.54 8.32-.64 1.68-1.46 3.34-2.68 4.96zm-3.84-15.5c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
			</svg>
		),
	},
	{
		platform: "Linux",
		hint: "AppImage / .deb / .rpm",
		icon: (
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
				<rect x="4" y="4" width="16" height="16" rx="2" />
				<circle cx="9" cy="9" r="1" fill="currentColor" />
				<circle cx="15" cy="9" r="1" fill="currentColor" />
				<circle cx="9" cy="15" r="1" fill="currentColor" />
				<circle cx="15" cy="15" r="1" fill="currentColor" />
				<circle cx="12" cy="12" r="1" fill="currentColor" />
			</svg>
		),
	},
];

export default function Home() {
	const containerRef = useReveal();

	return (
		<div ref={containerRef} className="min-h-screen">
			<Navbar />

			{/* ═══ HERO ═══ */}
			<section className="relative pt-32 pb-20 md:pt-44 md:pb-28 px-6 overflow-hidden">
				{/* Subtle radial glow */}
				<div
					className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-60 animate-glow-pulse"
					style={{
						background:
							"radial-gradient(ellipse at center, var(--glow) 0%, transparent 70%)",
					}}
				/>

				<div className="relative max-w-6xl mx-auto">
					<div className="text-center mb-14 md:mb-20">
						<p
							className="animate-fade-up text-[11px] md:text-[12px] font-mono tracking-[0.2em] uppercase text-muted mb-6"
							style={{ animationDelay: "0.1s" }}
						>
							The local-first skill manager for AI coding agents
						</p>
						<h1
							className="animate-fade-up text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-[1.08] tracking-tight text-foreground"
							style={{ animationDelay: "0.2s" }}
						>
							One vault for your skills.
							<br />
							<span className="text-muted">Every agent, always in sync.</span>
						</h1>
						<p
							className="animate-fade-up mt-6 md:mt-8 text-[15px] md:text-[17px] leading-relaxed text-muted max-w-xl mx-auto"
							style={{ animationDelay: "0.35s" }}
						>
							你的 Skill，一套母本，随处可用。SkillVault keeps a single master
							copy of every skill in{" "}
							<code className="font-mono text-[0.9em] bg-code-bg px-1.5 py-0.5 rounded-md border border-border">
								~/.agents/skills
							</code>{" "}
							and links it into 40+ AI coding agents. No account, no cloud, no
							duplicates.
						</p>

						{/* CTA buttons */}
						<div
							className="animate-fade-up flex flex-wrap items-center justify-center gap-3 mt-10"
							style={{ animationDelay: "0.5s" }}
						>
							<a
								href="#download"
								className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity no-underline"
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
									<polyline points="7 10 12 15 17 10" />
									<line x1="12" y1="15" x2="12" y2="3" />
								</svg>
								下载桌面端 / Download
							</a>
							<a
								// TODO: Point to the real repository once public.
								href={GITHUB_URL}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-medium rounded-lg border border-border text-foreground hover:bg-surface-hover transition-colors no-underline"
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
									<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
								</svg>
								查看源码 / Source
							</a>
						</div>

						{/* Stats */}
						<div
							className="animate-fade-up mt-10 flex items-center justify-center gap-12 md:gap-16"
							style={{ animationDelay: "0.6s" }}
						>
							<div className="text-center">
								<div className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">40+</div>
								<div className="text-[11px] font-mono tracking-wider uppercase text-muted mt-1">Agents supported</div>
							</div>
							<div className="w-px h-8 bg-border" />
							<div className="text-center">
								<div className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">1</div>
								<div className="text-[11px] font-mono tracking-wider uppercase text-muted mt-1">Master vault</div>
							</div>
							<div className="w-px h-8 bg-border" />
							<div className="text-center">
								<div className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">0</div>
								<div className="text-[11px] font-mono tracking-wider uppercase text-muted mt-1">Accounts needed</div>
							</div>
						</div>
					</div>

					{/* Desktop screenshot */}
					<div className="animate-fade-up relative" style={{ animationDelay: "0.7s" }}>
						<div
							className="pointer-events-none absolute -inset-8 opacity-30"
							style={{
								background: "radial-gradient(ellipse at center, var(--glow) 0%, transparent 70%)",
							}}
						/>
						<div className="relative bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-2xl shadow-black/20">
							<div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface">
								<div className="flex gap-1.5">
									<div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
									<div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
									<div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
								</div>
								<span className="text-[11px] font-mono text-muted/40 ml-2">SkillVault</span>
							</div>
							<img
								src="/skillvault-darkmode.png"
								alt="SkillVault Desktop App"
								className="w-full"
								loading="eager"
							/>
						</div>
					</div>
				</div>
			</section>


			{/* ═══ PAIN POINTS ═══ */}
			<section id="why" className="py-20 md:py-28 border-t border-border">
				<div className="max-w-6xl mx-auto px-6">
					<div className="reveal text-center mb-14 md:mb-20">
						<p className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted mb-3">
							Why SkillVault
						</p>
						<h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
							Skill chaos is the default.
							<br className="hidden sm:block" />
							It doesn't have to be.
						</h2>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{PAIN_POINTS.map((point, i) => (
							<div
								key={point.title}
								className="reveal bg-card-bg border border-card-border rounded-xl p-8"
								style={{ transitionDelay: `${i * 80}ms` }}
							>
								<div className="flex items-center gap-3 mb-4">
									<span className="text-muted">{point.icon}</span>
									<span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted">
										{point.label}
									</span>
								</div>
								<h3 className="text-[17px] font-semibold text-foreground mb-3">
									{point.title}
								</h3>
								<p className="text-[14px] text-muted leading-relaxed">
									{point.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>


			{/* ═══ HOW IT WORKS ═══ */}
			<section id="how-it-works" className="py-20 md:py-28 border-t border-border">
				<div className="max-w-4xl mx-auto px-6">
					<div className="reveal text-center mb-14 md:mb-20">
						<p className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted mb-3">
							How it works
						</p>
						<h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
							One vault, three steps,
							<br className="hidden sm:block" />
							every agent covered
						</h2>
					</div>

					<div className="reveal space-y-0">
						{HOW_IT_WORKS.map((item) => (
							<div
								key={item.step}
								className="flex gap-6 md:gap-10 py-8 border-b border-border last:border-0"
							>
								<span className="text-[13px] font-mono text-muted/40 pt-1 flex-shrink-0">
									{item.step}
								</span>
								<div className="flex-1">
									<h3 className="text-[17px] font-semibold text-foreground mb-2">
										{item.title}
									</h3>
									<p className="text-[14px] text-muted leading-relaxed">
										{item.desc}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>


			{/* ═══ AGENT WALL ═══ */}
			<section className="py-20 md:py-28 border-t border-border">
				<div className="max-w-5xl mx-auto px-6">
					<div className="reveal text-center mb-10">
						<p className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted mb-3">
							Works with your agents
						</p>
						<h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
							40+ agents supported
						</h2>
					</div>

					<div className="reveal flex flex-wrap items-center justify-center gap-2.5 max-w-3xl mx-auto">
						{AGENTS.map((agent) => (
							<span
								key={agent}
								className="text-[13px] text-muted border border-card-border bg-card-bg rounded-full px-4 py-2 hover:text-foreground hover:border-border transition-colors cursor-default"
							>
								{agent}
							</span>
						))}
					</div>
				</div>
			</section>


			{/* ═══ FEATURES ═══ */}
			<section id="features" className="py-20 md:py-28 border-t border-border">
				<div className="max-w-6xl mx-auto px-6">
					<div className="reveal text-center mb-14 md:mb-20">
						<p className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted mb-3">
							Features
						</p>
						<h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
							Everything a skill workflow needs
						</h2>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden">
						{FEATURES.map((feature, i) => (
							<div
								key={feature.title}
								className="reveal bg-card-bg p-8"
								style={{ transitionDelay: `${i * 80}ms` }}
							>
								<div className="flex items-center gap-3 mb-4">
									<span className="text-muted">{feature.icon}</span>
									<span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted">
										{feature.label}
									</span>
								</div>
								<h3 className="text-[17px] font-semibold text-foreground mb-3">
									{feature.title}
								</h3>
								<p className="text-[14px] text-muted leading-relaxed">
									{feature.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>


			{/* ═══ DOWNLOAD ═══ */}
			<section id="download" className="py-20 md:py-28 border-t border-border">
				<div className="max-w-4xl mx-auto px-6">
					<div className="reveal text-center mb-14 md:mb-20">
						<p className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted mb-3">
							Download
						</p>
						<h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
							Pick your platform
						</h2>
						<p className="mt-5 text-[15px] text-muted max-w-md mx-auto leading-relaxed">
							Free and open source. Everything runs locally — the app works
							fully offline after install.
						</p>
					</div>

					<div className="reveal grid grid-cols-1 md:grid-cols-3 gap-4">
						{DOWNLOADS.map((item, i) => (
							<a
								key={item.platform}
								// TODO: Point to real GitHub Releases assets once published.
								href={GITHUB_URL}
								target="_blank"
								rel="noopener noreferrer"
								className="group bg-card-bg border border-card-border rounded-xl p-8 text-center hover:border-border hover:bg-surface-hover transition-colors no-underline"
								style={{ transitionDelay: `${i * 80}ms` }}
							>
								<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-code-bg text-muted mb-5 group-hover:text-foreground transition-colors">
									{item.icon}
								</div>
								<h3 className="text-[16px] font-semibold text-foreground mb-1.5">
									{item.platform}
								</h3>
								<p className="text-[12px] text-muted">{item.hint}</p>
								<span className="inline-block mt-5 text-[12px] font-mono tracking-wider uppercase text-muted group-hover:text-foreground transition-colors">
									Download →
								</span>
							</a>
						))}
					</div>

					<p className="reveal text-center text-[13px] text-muted mt-10">
						All builds are published on{" "}
						<a
							// TODO: Replace with the real GitHub Releases page.
							href={GITHUB_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="text-foreground hover:text-accent transition-colors underline underline-offset-2"
						>
							GitHub Releases
						</a>
						.
					</p>
				</div>
			</section>


			{/* ═══ FOOTER ═══ */}
			<footer className="border-t border-border py-12 md:py-16">
				<div className="max-w-6xl mx-auto px-6">
					<div className="grid grid-cols-2 gap-8 mb-12 max-w-md">
						<div>
							<span className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted block mb-4">
								Product
							</span>
							<div className="space-y-2.5">
								<a href="#why" className="block text-[13px] text-muted hover:text-foreground transition-colors">Why SkillVault</a>
								<a href="#features" className="block text-[13px] text-muted hover:text-foreground transition-colors">Features</a>
								<a href="#download" className="block text-[13px] text-muted hover:text-foreground transition-colors">Download</a>
							</div>
						</div>
						<div>
							<span className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted block mb-4">
								Developers
							</span>
							<div className="space-y-2.5">
								<a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="block text-[13px] text-muted hover:text-foreground transition-colors">GitHub</a>
							</div>
						</div>
					</div>

					<div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-border gap-4">
						<span className="text-[12px] text-muted/60">
							MIT License · SkillVault · 本地优先，无遥测
						</span>
						<div className="flex items-center gap-5">
							<a
								href={GITHUB_URL}
								target="_blank"
								rel="noopener noreferrer"
								className="text-muted/60 hover:text-foreground transition-colors"
								aria-label="GitHub"
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
									<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
								</svg>
							</a>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
