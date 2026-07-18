import Link from "next/link";

export function PublicHeader({
  signedIn,
}: Readonly<{
  signedIn: boolean;
}>) {
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
          <Link href="/metrics">Metrics</Link>
          {signedIn ? (
            <Link href="/logs">Logs</Link>
          ) : (
            <Link href="/login">Sign in</Link>
          )}
        </nav>
      </header>
    </>
  );
}
