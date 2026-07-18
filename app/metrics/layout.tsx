import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { PublicHeader } from "@/components/public-header";

export default async function MetricsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (session?.user?.id) {
    return <AppShell user={session.user}>{children}</AppShell>;
  }

  return (
    <>
      <PublicHeader staticAuth />
      <div id="content" tabIndex={-1}>
        {children}
      </div>
    </>
  );
}
