import { PublicHeader } from "@/components/public-header";

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
