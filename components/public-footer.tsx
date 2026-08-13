import Image from "next/image";
import Link from "next/link";
import wtLogo from "@/public/brand/wt-logo.png";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-primary">
          <Link
            aria-label="Workout Trackr home"
            className="site-footer-brand"
            href="/"
          >
            <Image
              alt="Workout Trackr"
              className="site-footer-logo"
              sizes="(max-width: 720px) 170px, 190px"
              src={wtLogo}
            />
          </Link>
          <nav aria-label="Legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>

        <div className="site-footer-meta">
          <a className="site-footer-email" href="mailto:admin@workouttrackr.com">
            admin@workouttrackr.com
          </a>
          <p className="site-footer-copyright">
            Copyright © {currentYear} All rights reserved
          </p>
          <p className="site-footer-credit">
            Created by{" "}
            <a
              href="https://www.vasiliszisis.me/"
              rel="noopener noreferrer"
              target="_blank"
            >
              Vasilis Zisis
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
