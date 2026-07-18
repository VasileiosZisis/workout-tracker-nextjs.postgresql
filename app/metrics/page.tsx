import type { Metadata } from "next";

const pageDescription =
  "See the weightlifting and pace metrics you can record and calculate with Workout Trackr.";

export const metadata: Metadata = {
  title: "Metrics",
  description: pageDescription,
  alternates: {
    canonical: "/metrics",
  },
  openGraph: {
    title: "Metrics",
    description: pageDescription,
    type: "website",
    url: "/metrics",
  },
};

type MetricDefinition = {
  description: string;
  formula?: string;
  name: string;
  unit?: string;
};

type MetricCatalog = {
  calculated: MetricDefinition[];
  description: string;
  id: string;
  recorded: MetricDefinition[];
  title: string;
  tone: "blue" | "violet";
};

const metricCatalog: MetricCatalog[] = [
  {
    id: "weightlifting",
    title: "Weightlifting",
    description:
      "Record each set and separate demanding work from the rest of the session.",
    tone: "violet",
    recorded: [
      {
        name: "Repetitions",
        description: "The number of repetitions completed in each set.",
        unit: "reps",
      },
      {
        name: "Weight",
        description: "The load used for each set.",
        unit: "kg",
      },
      {
        name: "Hard set status",
        description:
          "Mark a set as hard when it should contribute to working volume.",
      },
    ],
    calculated: [
      {
        name: "Set volume",
        description: "The amount of weight moved in one set.",
        formula: "repetitions × weight",
        unit: "kg",
      },
      {
        name: "Total volume",
        description: "The combined volume of every set in the session.",
        formula: "sum of all set volume",
        unit: "kg",
      },
      {
        name: "Working volume",
        description: "The combined volume of sets marked as hard.",
        formula: "sum of hard-set volume",
        unit: "kg",
      },
      {
        name: "Junk volume",
        description: "The combined volume of sets not marked as hard.",
        formula: "sum of unmarked-set volume",
        unit: "kg",
      },
    ],
  },
  {
    id: "pace",
    title: "Pace",
    description:
      "Record timed distance sessions and compare how efficiently you cover ground.",
    tone: "blue",
    recorded: [
      {
        name: "Duration",
        description: "The hours, minutes, and seconds spent on the activity.",
        unit: "h · min · sec",
      },
      {
        name: "Distance",
        description: "The distance completed during the session.",
        unit: "km",
      },
    ],
    calculated: [
      {
        name: "Pace",
        description: "The average time needed to complete one kilometre.",
        formula: "duration in minutes ÷ distance",
        unit: "min/km",
      },
      {
        name: "Speed",
        description: "The average distance covered in one hour.",
        formula: "distance ÷ duration in hours",
        unit: "km/h",
      },
    ],
  },
];

function MetricList({ metrics }: { metrics: MetricDefinition[] }) {
  return (
    <dl className="metric-definition-list">
      {metrics.map((metric) => (
        <div className="metric-definition" key={metric.name}>
          <dt className="metric-definition-title">
            {metric.name}
            {metric.unit ? <span>{metric.unit}</span> : null}
          </dt>
          <dd>{metric.description}</dd>
          {metric.formula ? <code>{metric.formula}</code> : null}
        </div>
      ))}
    </dl>
  );
}

export default function MetricsPage() {
  return (
    <main className="page metrics-page">
      <header className="page-header">
        <h1>Metrics</h1>
      </header>

      <section
        className="metrics-intro section-block"
        aria-labelledby="metrics-intro-title"
      >
        <h2 id="metrics-intro-title">What Workout Trackr measures</h2>
        <p>
          You record the details of each session. Workout Trackr turns those inputs
          into consistent measurements you can compare over time.
        </p>
      </section>

      <div className="metrics-catalog">
        {metricCatalog.map((catalog) => (
          <section
            aria-labelledby={`${catalog.id}-metrics-title`}
            className={`metrics-category metrics-category-${catalog.tone}`}
            key={catalog.id}
          >
            <header className="metrics-category-header">
              <h2 id={`${catalog.id}-metrics-title`}>{catalog.title}</h2>
              <p>{catalog.description}</p>
            </header>

            <div className="metrics-columns">
              <div>
                <h3>You record</h3>
                <MetricList metrics={catalog.recorded} />
              </div>
              <div>
                <h3>Workout Trackr calculates</h3>
                <MetricList metrics={catalog.calculated} />
              </div>
            </div>
          </section>
        ))}
      </div>

      <section
        className="metrics-history section-block"
        aria-labelledby="metrics-history-title"
      >
        <div>
          <h2 id="metrics-history-title">Progress over time</h2>
          <p>
            Every session is dated, kept in your history, and available for
            comparison with earlier work.
          </p>
        </div>
        <ul>
          <li>
            <strong>Session history</strong>
            <span>Review the measurements recorded for every workout.</span>
          </li>
          <li>
            <strong>Progress charts</strong>
            <span>Follow volume, distance, pace, and speed across sessions.</span>
          </li>
          <li>
            <strong>Date ranges</strong>
            <span>Use preset periods or a custom range to focus the chart.</span>
          </li>
        </ul>
      </section>
    </main>
  );
}
