"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/",      label: "Home",  exact: true  },
  { href: "/chat",  label: "Chat",  exact: false },
  { href: "/admin", label: "Admin", exact: false },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="bg-background-surface border-b border-border-col px-6 py-3 flex items-center justify-between shrink-0">
      <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded bg-accent flex items-center justify-center text-accent-subtle font-bold text-xs font-mono shrink-0">
          AI
        </div>
        <div>
          <p className="font-display font-semibold text-text-col-primary text-sm leading-tight">AI Support Agent</p>
          <p className="text-xs text-text-col-tertiary font-mono tracking-wide leading-tight">Refund Assistant</p>
        </div>
      </Link>

      <div className="flex items-center gap-1">
        {navLinks.map(({ href, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium uppercase tracking-wider transition-colors duration-150 border ${
                active
                  ? "bg-accent/10 text-accent border-accent/30"
                  : "text-text-col-tertiary hover:text-text-col-secondary border-transparent"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
