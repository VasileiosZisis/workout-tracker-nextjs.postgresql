import { auth, signOut } from "@/auth";
import Link from "next/link";

export async function AuthButton() {
  const session = await auth();

  if (!session?.user) {
    return <Link href="/login">Login</Link>;
  }

  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button className="nav-button" type="submit">
        Sign out
      </button>
    </form>
  );
}
