"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "/logs",
    label: "Logs",
    supporting: "Sessions",
  },
  {
    href: "/routine",
    label: "Routine",
    supporting: "Workout setup",
  },
  {
    href: "/metrics",
    label: "Metrics",
    supporting: "What you can track",
  },
  {
    href: "/profile",
    label: "Profile",
    supporting: "Account",
  },
];

export function AppNav({
  placement,
}: Readonly<{
  placement: "sidebar" | "bottom";
}>) {
  const pathname = usePathname();

  return (
    <nav
      className={clsx("app-nav", `app-nav-${placement}`)}
      aria-label={placement === "bottom" ? "Mobile navigation" : "App navigation"}
    >
      {links.map((link) => {
        const active =
          link.href === "/logs"
            ? pathname === "/logs" || pathname.startsWith("/logs/")
            : link.href === "/routine"
              ? pathname === "/routine" || pathname.startsWith("/routine/")
              : pathname === link.href;

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={clsx("app-nav-link", active && "is-active")}
            href={link.href}
            key={link.href}
          >
            <span>{link.label}</span>
            <small>{link.supporting}</small>
          </Link>
        );
      })}
    </nav>
  );
}
