import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cache } from "react";

const getRequiredUser = cache(async () => {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user;
});

export function requireUser() {
  return getRequiredUser();
}
