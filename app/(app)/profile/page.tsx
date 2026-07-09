import { requireUser } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <main className="page">
      <section className="page-header">
        <h1>Profile</h1>
        <div className="empty-state">
          <p>{user.email ?? user.name ?? "Signed in user"}</p>
        </div>
      </section>
    </main>
  );
}
