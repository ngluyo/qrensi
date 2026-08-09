"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, ScanLine, CalendarDays, User } from "lucide-react";

const items = [
  { href: "/beranda", label: "Beranda", icon: Home },
  { href: "/absensi", label: "Absensi", icon: ScanLine },
  { href: "/riwayat", label: "Riwayat", icon: CalendarDays },
  { href: "/profil", label: "Profil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-20 border-t border-border/70 bg-surface/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                onClick={() => navigator.vibrate?.(8)}
                aria-current={active ? "page" : undefined}
                className="group relative flex flex-col items-center gap-1 py-2.5"
              >
                <span className="relative flex h-8 w-16 items-center justify-center">
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-brand-soft"
                      transition={{ type: "spring", stiffness: 500, damping: 34 }}
                    />
                  )}
                  <Icon
                    className={`relative size-[22px] transition-colors ${
                      active ? "text-brand" : "text-muted"
                    }`}
                    strokeWidth={active ? 2.4 : 2}
                  />
                </span>
                <span
                  className={`text-[11px] font-semibold transition-colors ${
                    active ? "text-brand" : "text-muted"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
