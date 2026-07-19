"use server";

import { auth } from "@/auth";
import { authSessionCookie } from "@/lib/auth-session";
import { env } from "@/lib/env";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createDemoSandbox, DemoCapacityError } from "./service";

export async function startDemoAction() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/logs");
  }

  if (!env.DEMO_ENABLED) {
    redirect("/demo?status=disabled");
  }

  let sandbox: Awaited<ReturnType<typeof createDemoSandbox>>;

  try {
    sandbox = await createDemoSandbox();
  } catch (error) {
    if (error instanceof DemoCapacityError) {
      redirect("/demo?status=capacity");
    }

    console.error("Failed to create temporary demo sandbox.", error);
    redirect("/demo?status=unavailable");
  }

  const cookieStore = await cookies();
  cookieStore.set(authSessionCookie.name, sandbox.sessionToken, {
    ...authSessionCookie.options,
    expires: sandbox.expires,
  });

  redirect("/logs");
}
