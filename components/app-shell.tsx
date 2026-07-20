import type { Session } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { AppNav } from "@/components/app-nav";
import wtLogo from "@/public/brand/wt-logo.png";

export function AppShell({
  children,
  user,
}: Readonly<{
  children: React.ReactNode;
  user: Session["user"];
}>) {
  const accountLabel = user.name ?? user.email ?? "Signed in";
  const accountDetail = user.isDemo
    ? "Temporary demo workspace"
    : user.email && user.name
      ? user.email
      : "Training data";
  const demoExpiration = user.demoExpiresAt
    ? `${new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(user.demoExpiresAt))} UTC`
    : null;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <aside className="app-sidebar" aria-label="Workspace navigation">
        <div className="app-brand-block">
          <Link className="app-brand app-brand-logo-link" href="/logs">
            <Image
              className="app-brand-logo"
              src={wtLogo}
              alt="Workout Trackr"
              priority
              sizes="205px"
            />
          </Link>
        </div>

        <AppNav placement="sidebar" />

        <div className="app-account">
          <div>
            <p>{accountLabel}</p>
            <span>{accountDetail}</span>
          </div>
          <AuthButton />
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div>
            <Link className="app-brand" href="/logs">
              Workout Trackr
            </Link>
            <p>Evidence first training</p>
          </div>
          <AuthButton />
        </header>

        {user.isDemo ? (
          <aside className="demo-banner" aria-label="Temporary demo status">
            <strong>Temporary demo</strong>
            <span>
              Your changes are private and will be deleted
              {demoExpiration ? ` at ${demoExpiration}` : " after two hours"}.
            </span>
          </aside>
        ) : null}

        <div id="content" className="app-main-content" tabIndex={-1}>
          {children}
        </div>
      </div>

      <AppNav placement="bottom" />
    </div>
  );
}
