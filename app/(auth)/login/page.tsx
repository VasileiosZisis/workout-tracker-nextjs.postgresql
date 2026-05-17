import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <main className="page">
      <section className="page-header">
        <p className="eyebrow">Auth foundation</p>
        <h1>Login</h1>
        <p className="lede">
          Google OAuth will be wired in during the auth milestone.
        </p>
      </section>
    </main>
  );
}
