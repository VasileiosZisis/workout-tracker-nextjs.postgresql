import type { User } from "next-auth";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { AppNav } from "@/components/app-nav";

export function AppShell({
  children,
  user,
}: Readonly<{
  children: React.ReactNode;
  user: User;
}>) {
  const accountLabel = user.name ?? user.email ?? "Signed in";
  const accountDetail = user.email && user.name ? user.email : "Training data";

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Workspace navigation">
        <div className="app-brand-block">
          <span className="app-brand-mark" aria-hidden="true">
            WT
          </span>
          <div>
            <Link className="app-brand" href="/logs">
              Workout Trackr
            </Link>
            <p>Performance Lab</p>
          </div>
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

        {children}
      </div>

      <AppNav placement="bottom" />
    </div>
  );
}
