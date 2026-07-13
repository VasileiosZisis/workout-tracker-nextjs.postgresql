import { Suspense } from "react";
import type { Metadata } from "next";
import { AppLoading } from "@/components/app-loading";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
};

async function AuthorizedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return <AppShell user={user}>{children}</AppShell>;
}

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<AppLoading />}>
      <AuthorizedAppLayout>{children}</AuthorizedAppLayout>
    </Suspense>
  );
}
