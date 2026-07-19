import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { HomeRevealController } from "@/components/home-reveal-controller";
import { env } from "@/lib/env";

const principles = [
  {
    title: "Capture the details that matter",
    label: "Record",
    copy: "Log weight, repetitions, hard sets, duration, and distance with forms designed for quick day-to-day use.",
  },
  {
    title: "Let the numbers do the work",
    label: "Measure",
    copy: "Working volume, total volume, pace, and speed are calculated automatically from your session data.",
  },
  {
    title: "See change over time",
    label: "Review",
    copy: "Use session history and progress charts to identify trends, compare recent performance, and decide what to improve next.",
  },
];

const workflow = [
  {
    title: "Create a log",
    copy: "Organize training by plan, goal, or phase.",
  },
  {
    title: "Add your activities",
    copy: "Track weightlifting movements or pace-based activities.",
  },
  {
    title: "Record each session",
    copy: "Keep the measurements consistent and reference your previous performance.",
  },
  {
    title: "Review the trend",
    copy: "See how volume, pace, speed, and distance change over time.",
  },
];

const metrics = [
  "Working volume",
  "Hard sets",
  "Total volume",
  "Pace",
  "Speed",
  "Distance",
];

export default function HomePage() {
  return (
    <main className="home">
      <HomeRevealController />
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <h1 id="home-title">Record the work. Read the progress.</h1>
            <p>
              Track weightlifting and pace-based sessions, calculate the metrics
              that matter, and see how your performance changes over time.
            </p>
            <div className="home-actions">
              <Link
                className="button"
                href={env.DEMO_ENABLED ? "/demo" : "/login"}
              >
                {env.DEMO_ENABLED ? "Try demo" : "Start tracking"}
              </Link>
              <Link className="button-secondary" href="/login">
                Sign in
              </Link>
            </div>
          </div>

          <figure className="home-hero-visual">
            <Image
              alt="Bench Press progress showing working volume, hard sets, total volume, and a volume-over-time chart."
              height={840}
              priority
              sizes="(max-width: 900px) 142vw, (max-width: 1100px) 85vw, 64vw"
              src="/home/bench-progress.png"
              width={1016}
            />
          </figure>
        </div>
      </section>

      <section className="home-section home-intro home-reveal" aria-labelledby="home-intro-title">
        <div className="home-section-heading" data-reveal="rise">
          <h2 id="home-intro-title">A clearer record of your training</h2>
          <p>
            Workout Trackr turns individual sessions into structured evidence.
            Organize your activities, record consistent measurements, and compare
            results without spreadsheets or guesswork.
          </p>
        </div>

        <div className="home-principles">
          {principles.map((principle, index) => (
            <article
              data-reveal="rise"
              key={principle.label}
              style={
                {
                  "--reveal-delay": `${index * 85}ms`,
                } as CSSProperties
              }
            >
              <span>{principle.label}</span>
              <h3>{principle.title}</h3>
              <p>{principle.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-workflow home-reveal" aria-labelledby="home-workflow-title">
        <div className="home-workflow-inner">
          <div className="home-section-heading" data-reveal="rise">
            <h2 id="home-workflow-title">From training session to useful evidence</h2>
          </div>
          <ol>
            {workflow.map((step, index) => (
              <li
                data-reveal="rise"
                key={step.title}
                style={
                  {
                    "--reveal-delay": `${index * 75}ms`,
                  } as CSSProperties
                }
              >
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="home-section home-proof home-reveal" aria-labelledby="home-metrics-title">
        <figure className="home-product-shot" data-reveal="left">
          <Image
            alt="Tempo Run progress showing pace, distance, speed, and a pace-and-speed-over-time chart."
            height={837}
            sizes="(max-width: 900px) 128vw, 58vw"
            src="/home/tempo-progress.png"
            width={1016}
          />
        </figure>

        <div className="home-proof-copy" data-reveal="right">
          <h2 id="home-metrics-title">Built around measurable performance</h2>
          <ul aria-label="Tracked performance metrics">
            {metrics.map((metric) => (
              <li key={metric}>{metric}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="home-close" aria-label="Get started">
        <div className="home-close-inner">
          <div className="home-privacy">
            <h2>Your training data stays yours</h2>
            <p>
              Every log, exercise, and session belongs to your private account.
              Workout Trackr is a personal workspace, not a social feed.
            </p>
          </div>

          <div className="home-final-cta">
            <h2>Build a record you can learn from</h2>
            <p>
              Start capturing consistent training evidence and turn each session
              into a clearer view of your progress.
            </p>
            <div className="home-actions">
              <Link
                className="button"
                href={env.DEMO_ENABLED ? "/demo" : "/login"}
              >
                {env.DEMO_ENABLED ? "Try demo" : "Start tracking"}
              </Link>
              {env.DEMO_ENABLED ? (
                <Link className="button-secondary" href="/login">
                  Sign in
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <p>
          Created by{" "}
          <a
            href="https://www.vasiliszisis.me/"
            rel="noopener noreferrer"
            target="_blank"
          >
            Vasilis Zisis
          </a>
        </p>
      </footer>
    </main>
  );
}
