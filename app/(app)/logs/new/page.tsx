import type { Metadata } from "next";
import Link from "next/link";
import { createLogAction } from "@/features/logs/actions";
import { LogForm } from "@/features/logs/components/log-form";

export const metadata: Metadata = {
  title: "New Log",
};

export default function NewLogPage() {
  return (
    <main className="page">
      <Link className="text-link" href="/logs">
        Logs
      </Link>
      <section className="page-header compact-header">
        <p className="eyebrow">New log</p>
        <h1>Create log</h1>
      </section>
      <section className="section-block narrow">
        <LogForm action={createLogAction} submitLabel="Create log" />
      </section>
    </main>
  );
}
