import type { Metadata } from "next";
import { PublicHeader } from "@/components/public-header";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <PublicHeader />
      <div id="content" tabIndex={-1}>
        {children}
      </div>
    </>
  );
}
