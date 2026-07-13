import type { Metadata } from "next";
import { env } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: {
    default: "Workout Trackr",
    template: "%s | Workout Trackr",
  },
  description: "Log workouts and read factual training progress.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    description: "Log workouts and read factual training progress.",
    siteName: "Workout Trackr",
    title: "Workout Trackr",
    type: "website",
    url: "/",
  },
  robots: env.IS_PREVIEW
    ? { follow: false, index: false }
    : { follow: true, index: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
