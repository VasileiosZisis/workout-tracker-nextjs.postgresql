import { auth } from "@/auth";
import { PublicHeader } from "@/components/public-header";
import { env } from "@/lib/env";

export default async function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <>
      <PublicHeader
        demoEnabled={env.DEMO_ENABLED}
        showLogo
        signedIn={Boolean(session?.user?.id)}
      />
      <div id="content" tabIndex={-1}>
        {children}
      </div>
    </>
  );
}
