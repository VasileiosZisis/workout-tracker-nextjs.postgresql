import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Workout Tracker",
    template: "%s | Workout Tracker",
  },
  description: "Log workouts and track training progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            Workout Tracker
          </Link>
          <nav className="site-nav" aria-label="Main navigation">
            <Link href="/login">Login</Link>
            <Link href="/logs">Logs</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
