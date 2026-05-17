"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  PaceProgressPoint,
  WeightliftingProgressPoint,
} from "../mapping";

function numberFormatter(value: number) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function WeightliftingProgressChart({
  data,
}: {
  data: WeightliftingProgressPoint[];
}) {
  if (data.length === 0) {
    return (
      <section className="empty-state section-block">
        <p>No progress data yet.</p>
      </section>
    );
  }

  return (
    <section className="section-block chart-section" aria-labelledby="progress-heading">
      <div className="section-heading">
        <h2 id="progress-heading">Progress</h2>
      </div>
      <div className="chart-frame" aria-label="Weightlifting volume chart">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ top: 12, right: 24, bottom: 8, left: 8 }}
          >
            <CartesianGrid stroke="#d9d7cf" strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={numberFormatter} />
            <Tooltip formatter={(value) => `${numberFormatter(Number(value))} kg`} />
            <Legend />
            <Line
              dataKey="totalVolume"
              dot
              name="Total volume"
              stroke="#154a3c"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="workingVolume"
              dot
              name="Working volume"
              stroke="#256f5b"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="junkVolume"
              dot
              name="Junk volume"
              stroke="#8a6f2a"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="data-table chart-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Total volume</th>
            <th>Working volume</th>
            <th>Junk volume</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.id}>
              <td>{point.date}</td>
              <td>{numberFormatter(point.totalVolume)} kg</td>
              <td>{numberFormatter(point.workingVolume)} kg</td>
              <td>{numberFormatter(point.junkVolume)} kg</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function PaceProgressChart({ data }: { data: PaceProgressPoint[] }) {
  if (data.length === 0) {
    return (
      <section className="empty-state section-block">
        <p>No progress data yet.</p>
      </section>
    );
  }

  return (
    <section className="section-block chart-section" aria-labelledby="progress-heading">
      <div className="section-heading">
        <h2 id="progress-heading">Progress</h2>
      </div>
      <div className="chart-frame" aria-label="Pace and speed chart">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ top: 12, right: 24, bottom: 8, left: 8 }}
          >
            <CartesianGrid stroke="#d9d7cf" strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={numberFormatter} />
            <Tooltip formatter={(value) => numberFormatter(Number(value))} />
            <Legend />
            <Line
              dataKey="pace"
              dot
              name="Pace min/km"
              stroke="#154a3c"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="speed"
              dot
              name="Speed km/h"
              stroke="#256f5b"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="distance"
              dot
              name="Distance km"
              stroke="#8a6f2a"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="data-table chart-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Distance</th>
            <th>Pace</th>
            <th>Speed</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.id}>
              <td>{point.date}</td>
              <td>{numberFormatter(point.distance)} km</td>
              <td>{numberFormatter(point.pace)} min/km</td>
              <td>{numberFormatter(point.speed)} km/h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
