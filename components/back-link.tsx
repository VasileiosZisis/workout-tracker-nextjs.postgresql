import type { ReactNode } from "react";
import Link from "next/link";

export function BackLink({
  children,
  href,
}: Readonly<{
  children: ReactNode;
  href: string;
}>) {
  return (
    <Link className="eyebrow eyebrow-link" href={href}>
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path d="m12.5 4-6 6 6 6" />
      </svg>
      <span>{children}</span>
    </Link>
  );
}
