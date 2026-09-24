import Image from "next/image";
import Link from "next/link";
import wtFavicon from "@/app/icon3.png";
import wtLogo from "@/public/brand/wt-logo.png";

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
          <picture className="responsive-brand-image">
            <source media="(max-width: 420px)" srcSet={wtFavicon.src} />
            <Image
              className="brand-logo"
              src={wtLogo}
              alt="Workout Trackr"
              priority
              sizes="(max-width: 420px) 40px, 205px"
            />
          </picture>
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          <Link href="/metrics">Metrics</Link>
          {demoEnabled ? <Link href="/demo">Try demo</Link> : null}
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
