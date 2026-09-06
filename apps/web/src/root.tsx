import type { LinksFunction, MetaFunction } from "react-router";
import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";
import "./globals.css";

export const links: LinksFunction = () => [
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Sora:wght@100..800&family=Geist+Mono:wght@100..900&display=swap",
	},
	{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];

export const meta: MetaFunction = () => [
	{ title: "SkillVault — One vault for your skills. Every agent, always in sync." },
	{
		name: "description",
		content:
			"SkillVault is a local-first desktop app that keeps a single master copy of your AI agent skills (~/.agents/skills) and syncs them to 40+ coding agents like Claude Code, Cursor, Windsurf, and Codex CLI via symlinks. No account, no cloud.",
	},
	{ property: "og:title", content: "SkillVault" },
	{
		property: "og:description",
		content:
			"One vault for your skills. Every agent, always in sync. Local-first skill management for 40+ AI coding agents.",
	},
	{ property: "og:url", content: "https://skillvault.ai" },
	{ property: "og:site_name", content: "SkillVault" },
	{ property: "og:type", content: "website" },
	{ name: "twitter:card", content: "summary_large_image" },
	{ name: "twitter:title", content: "SkillVault" },
	{
		name: "twitter:description",
		content:
			"One vault for your skills. Every agent, always in sync. Local-first skill management for 40+ AI coding agents.",
	},
];

export default function Root() {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
				{/* Inline script to prevent flash of wrong theme.
				    Default: light. Follows stored preference, then system preference. */}
				<script
					dangerouslySetInnerHTML={{
						__html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
					}}
				/>
			</head>
			<body className="font-sans antialiased bg-background text-foreground">
				<Outlet />
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}
