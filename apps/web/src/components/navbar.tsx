import { useState, useEffect, useRef } from "react";
import { ThemeToggle } from "./theme-toggle";
import { NavbarStarButton } from "./github-star-prompt";

export function Navbar() {
	const [scrolled, setScrolled] = useState(false);
	const [hidden, setHidden] = useState(false);
	const lastY = useRef(0);

	useEffect(() => {
		const onScroll = () => {
			const y = window.scrollY;
			setScrolled(y > 20);
			setHidden(y > 80 && y > lastY.current);
			lastY.current = y;
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<nav
			className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
				hidden ? "-translate-y-full" : "translate-y-0"
			} ${
				scrolled
					? "bg-nav-bg backdrop-blur-xl border-b border-nav-border"
					: "bg-transparent"
			}`}
		>
			<div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
				{/* Logo */}
				<a href="/" className="flex items-center gap-2.5 group">
					<span className="text-[17px] font-semibold tracking-tight text-foreground">
						SkillVault
					</span>
				</a>

				{/* Center nav links */}
				<div className="hidden md:flex items-center gap-8">
					<a
						href="/#features"
						className="text-[13px] tracking-wide uppercase text-muted hover:text-foreground transition-colors"
					>
						Features
					</a>
					<a
						href="/#download"
						className="text-[13px] tracking-wide uppercase text-muted hover:text-foreground transition-colors"
					>
						Download
					</a>
					<NavbarStarButton />
				</div>

				{/* Right section */}
				<div className="flex items-center gap-3">
					<ThemeToggle />
				</div>
			</div>
		</nav>
	);
}
