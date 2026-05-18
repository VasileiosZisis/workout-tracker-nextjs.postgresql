import Link from "next/link";
import { AuthButton } from "@/components/auth-button";

export function PublicHeader() {
  return (
    <>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="brand" href="/">
          Workout Trackr
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          <Link href="/logs">Logs</Link>
          <AuthButton />
        </nav>
      </header>
    </>
  );
}
