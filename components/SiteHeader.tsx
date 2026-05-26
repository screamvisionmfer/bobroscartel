"use client";

import { motion, type MotionStyle } from "framer-motion";

const mintUrl = "https://launchmynft.io/mint/bobroscartel";

const homeNavItems = [
  { label: "Mint", href: mintUrl, external: true },
  { label: "Collection", href: "#collection", external: false },
  { label: "$BOBO", href: "#token", external: false },
  { label: "About", href: "#about", external: false },
  { label: "Contact", href: "#contact", external: false },
  { label: "Game", href: "/game", external: false },
] as const;

const gameNavItems = [
  { label: "Mint", href: mintUrl, external: true },
  { label: "Collection", href: "/#collection", external: false },
  { label: "$BOBO", href: "/#token", external: false },
  { label: "About", href: "/#about", external: false },
  { label: "Contact", href: "/#contact", external: false },
] as const;

type SiteHeaderProps = {
  logoStyle?: MotionStyle;
  navStyle?: MotionStyle;
  onThemeToggle?: () => void;
  theme?: "day" | "night";
  variant?: "home" | "game";
};

export default function SiteHeader({ logoStyle, navStyle, onThemeToggle, theme = "day", variant = "home" }: SiteHeaderProps) {
  const isGame = variant === "game";
  const navItems = isGame ? gameNavItems : homeNavItems;

  return (
    <header className={`site-header shell${isGame ? " site-header-game" : ""}`} id={isGame ? undefined : "top"}>
      <motion.a
        className="logo-link"
        href={isGame ? "/" : "#top"}
        aria-label={isGame ? "Back to BOBROS home" : "BOBROS home"}
        initial={{ opacity: 0, y: -14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.08, duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        style={logoStyle}
      >
        <img className="logo-image" src="/assets/logo.png" alt="BOBROS" />
      </motion.a>

      <motion.div
        className="header-actions"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        style={navStyle}
      >
        <nav className="nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <a key={item.label} href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noopener noreferrer" : undefined}>
              {item.label}
            </a>
          ))}
        </nav>

        {isGame ? (
          <a className="theme-toggle" href="/">
            BACK TO SITE
          </a>
        ) : (
          <button className="theme-toggle" type="button" aria-pressed={theme === "night"} onClick={onThemeToggle}>
            {theme === "night" ? "DAY MODE" : "NIGHT MODE"}
          </button>
        )}
      </motion.div>
    </header>
  );
}
