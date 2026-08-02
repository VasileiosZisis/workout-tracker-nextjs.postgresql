import type { Metadata } from "next";
import { env } from "@/lib/env";
import "./globals.css";

const homepageTitle = "Track Weightlifting & Pace Progress | Workout Trackr";
const homepageDescription =
  "Track weightlifting and pace-based workouts, calculate useful metrics, and see how your performance changes over time.";
const socialImage = {
  alt: "Workout Trackr homepage alongside a Bench Press progress dashboard",
  height: 630,
  type: "image/png",
  url: "/brand/social-preview.png",
  width: 1201,
};

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: {
    default: homepageTitle,
    template: "%s | Workout Trackr",
  },
  description: homepageDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    description: homepageDescription,
    images: [socialImage],
    siteName: "Workout Trackr",
    title: homepageTitle,
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
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
