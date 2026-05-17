import type { Metadata } from "next";
import { AuthButton } from "@/components/auth-button";
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
            <Link href="/logs">Logs</Link>
            <Link href="/profile">Profile</Link>
            <AuthButton />
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
