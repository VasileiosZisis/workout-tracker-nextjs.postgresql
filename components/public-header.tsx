import Link from "next/link";

export function PublicHeader({
  demoEnabled,
  signedIn,
}: Readonly<{
  demoEnabled: boolean;
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
            <>
              {demoEnabled ? <Link href="/demo">Try demo</Link> : null}
              <Link href="/login">Sign in</Link>
            </>
          )}
        </nav>
      </header>
    </>
  );
}
