import { SubmitButton } from "@/components/submit-button";
import { auth, signOut } from "@/auth";
import Link from "next/link";

export async function AuthButton() {
  const session = await auth();

  if (!session?.user) {
    return <Link href="/login">Sign in</Link>;
  }

  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <SubmitButton
        className="nav-button"
        pendingLabel={session.user.isDemo ? "Exiting demo…" : "Signing out…"}
      >
        {session.user.isDemo ? "Exit demo" : "Sign out"}
      </SubmitButton>
    </form>
  );
}
