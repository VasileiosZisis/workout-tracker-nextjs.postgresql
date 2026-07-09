import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { createLogAction } from "@/features/logs/actions";
import { LogForm } from "@/features/logs/components/log-form";

export const metadata: Metadata = {
  title: "New Log",
};

export default function NewLogPage() {
  return (
    <main className="page">
      <BackLink href="/logs">New log</BackLink>
      <section className="page-header compact-header">
        <h1>Create log</h1>
      </section>
      <section className="section-block narrow">
        <LogForm action={createLogAction} submitLabel="Create log" />
      </section>
    </main>
  );
}
