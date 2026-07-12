import { Suspense } from "react";
import { AppLoading } from "@/components/app-loading";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

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
