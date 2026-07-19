import { deleteExpiredDemoUsers } from "@/features/demo/lifecycle";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  if (
    !env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const deleted = await deleteExpiredDemoUsers();

  return Response.json(
    { deletedUsers: deleted.count },
    { headers: { "Cache-Control": "no-store" } },
  );
}
