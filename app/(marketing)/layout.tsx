import { auth } from "@/auth";
import { PublicHeader } from "@/components/public-header";

export default async function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <>
      <PublicHeader signedIn={Boolean(session?.user?.id)} />
      <div id="content" tabIndex={-1}>
        {children}
      </div>
    </>
  );
}
