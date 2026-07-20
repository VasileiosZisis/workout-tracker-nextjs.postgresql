import Image from "next/image";
import Link from "next/link";
import wtLogo from "@/public/brand/wt-logo.png";

export function PublicHeader({
  demoEnabled,
  showLogo = false,
  signedIn,
}: Readonly<{
  demoEnabled: boolean;
  showLogo?: boolean;
  signedIn: boolean;
}>) {
  return (
    <>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="brand" href="/">
          {showLogo ? (
            <Image
              className="brand-logo"
              src={wtLogo}
              alt="Workout Trackr"
              priority
              sizes="(max-width: 420px) 160px, 205px"
            />
          ) : (
            "Workout Trackr"
          )}
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
