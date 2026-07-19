import type { Metadata } from "next";
import { auth } from "@/auth";
import { PublicHeader } from "@/components/public-header";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
};

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <>
      <PublicHeader
        demoEnabled={env.DEMO_ENABLED}
        signedIn={Boolean(session?.user?.id)}
      />
      <div id="content" tabIndex={-1}>
        {children}
      </div>
    </>
  );
}
