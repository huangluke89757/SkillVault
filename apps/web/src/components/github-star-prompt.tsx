import { useState, useEffect } from "react";

const REPO_URL = "https://github.com/huangluke89757/SkillVault";
const REPO_API_URL = "https://api.github.com/repos/huangluke89757/SkillVault";
const DISMISSED_KEY = "skillvault:star-banner-dismissed";
const PROMPT_SHOWN_KEY = "skillvault:star-prompt-shown";

// ─── Star count hook ─────────────────────────────────────────────────

export function useGitHubStars(): number | null {
	const [stars, setStars] = useState<number | null>(null);

	useEffect(() => {
		// Check cache first
		const cached = sessionStorage.getItem("skillvault:gh-stars");
		if (cached) {
			setStars(Number(cached));
			return;
		}

		fetch(REPO_API_URL, {
			headers: { Accept: "application/vnd.github.v3+json" },
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data: any) => {
				if (data?.stargazers_count != null) {
					setStars(data.stargazers_count);
					sessionStorage.setItem("skillvault:gh-stars", String(data.stargazers_count));
				}
			})
			.catch(() => {});
	}, []);

	return stars;
}

function formatCount(n: number): string {
	if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
	return String(n);
}

// ─── Navbar star button ──────────────────────────────────────────────

export function NavbarStarButton() {
	const stars = useGitHubStars();

	return (
		<a
			href={REPO_URL}
			target="_blank"
			rel="noopener noreferrer"
			className="group inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/[0.06] px-3 py-1.5 text-[12px] font-medium tracking-wide text-amber-200/90 transition-all hover:border-amber-500/40 hover:bg-amber-500/[0.10] hover:text-amber-100"
		>
			<svg
				className="h-4 w-4 text-amber-400 transition-transform group-hover:scale-110"
				viewBox="0 0 24 24"
				fill="currentColor"
				aria-hidden="true"
			>
				<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
			</svg>
			Star
			{stars != null && (
				<span className="inline-flex items-center rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[11px] tabular-nums text-amber-300/80">
					{formatCount(stars)}
				</span>
			)}
		</a>
	);
}

// ─── Dashboard star banner (dismissible) ─────────────────────────────

export function DashboardStarBanner() {
	const [dismissed, setDismissed] = useState(true);
	const stars = useGitHubStars();

	useEffect(() => {
		setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
	}, []);

	if (dismissed) return null;

	function handleDismiss() {
		localStorage.setItem(DISMISSED_KEY, "1");
		setDismissed(true);
	}

	return (
		<div className="relative mb-6 overflow-hidden rounded-xl border border-amber-500/15 bg-gradient-to-r from-amber-500/[0.06] via-transparent to-amber-500/[0.04] px-5 py-4">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3.5">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
						<svg className="h-5 w-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
						</svg>
					</div>
					<div>
						<p className="text-[13px] font-medium text-foreground">
							Enjoying SkillVault? Star us on GitHub
							{stars != null && (
								<span className="ml-1.5 text-muted">
									({formatCount(stars)} stars)
								</span>
							)}
						</p>
						<p className="mt-0.5 text-[12px] text-muted">
							It helps others discover the project and keeps us motivated.
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2.5">
					<a
						href={REPO_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3.5 py-1.5 text-[12px] font-medium text-amber-200 transition-colors hover:bg-amber-500/25"
					>
						<svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
							<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
						</svg>
						Star on GitHub
					</a>
					<button
						onClick={handleDismiss}
						className="rounded-md p-1 text-muted transition-colors hover:text-foreground"
						aria-label="Dismiss"
					>
						<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M18 6L6 18M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	);
}

// ─── Post-signup star modal (shown once) ─────────────────────────────

export function StarPromptModal() {
	const [show, setShow] = useState(false);

	useEffect(() => {
		// Show only once, and only if we just came from an OAuth callback
		// (detected by landing on /dashboard/skills with no prior visit)
		const alreadyShown = localStorage.getItem(PROMPT_SHOWN_KEY) === "1";
		if (alreadyShown) return;

		// Small delay so the dashboard loads first
		const timer = setTimeout(() => setShow(true), 1200);
		return () => clearTimeout(timer);
	}, []);

	if (!show) return null;

	function handleClose() {
		localStorage.setItem(PROMPT_SHOWN_KEY, "1");
		setShow(false);
	}

	function handleStar() {
		localStorage.setItem(PROMPT_SHOWN_KEY, "1");
		localStorage.setItem(DISMISSED_KEY, "1"); // also dismiss the banner
		window.open(REPO_URL, "_blank", "noopener,noreferrer");
		setShow(false);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/60 backdrop-blur-sm"
				onClick={handleClose}
			/>

			{/* Modal */}
			<div className="relative w-full max-w-sm animate-[fade-up_0.3s_ease-out] rounded-2xl border border-zinc-800/60 bg-zinc-900/95 p-8 backdrop-blur-md">
				{/* Close */}
				<button
					onClick={handleClose}
					className="absolute right-3 top-3 rounded-md p-1 text-zinc-500 transition-colors hover:text-zinc-300"
					aria-label="Close"
				>
					<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M18 6L6 18M6 6l12 12" />
					</svg>
				</button>

				{/* Star icon */}
				<div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
					<svg className="h-7 w-7 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
						<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
					</svg>
				</div>

				<h3 className="text-center text-[17px] font-semibold text-white">
					Welcome to SkillVault
				</h3>
				<p className="mt-2 text-center text-[13px] leading-relaxed text-zinc-400">
					We're open source and community-driven. A quick star on GitHub helps
					more developers discover the project.
				</p>

				<div className="mt-6 flex flex-col gap-2.5">
					<button
						onClick={handleStar}
						className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500/15 px-4 py-2.5 text-[13px] font-medium text-amber-200 transition-colors hover:bg-amber-500/25"
					>
						<svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
							<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
						</svg>
						Star on GitHub
					</button>
					<button
						onClick={handleClose}
						className="w-full rounded-xl px-4 py-2.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-300"
					>
						Maybe later
					</button>
				</div>
			</div>
		</div>
	);
}
