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
      <button className="nav-button" type="submit">
        {session.user.isDemo ? "Exit demo" : "Sign out"}
      </button>
    </form>
  );
}
