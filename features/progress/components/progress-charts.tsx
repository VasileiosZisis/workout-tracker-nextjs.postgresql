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
        <p>No progress evidence yet.</p>
      </section>
    );
  }

  return (
    <section className="section-block chart-section" aria-labelledby="progress-heading">
      <div className="section-heading">
        <h2 id="progress-heading">Progress evidence</h2>
      </div>
      <div className="chart-frame" aria-label="Weightlifting volume chart">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ top: 12, right: 24, bottom: 8, left: 8 }}
          >
            <CartesianGrid stroke="#273044" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#8d96a8" tick={{ fill: "#8d96a8" }} />
            <YAxis
              stroke="#8d96a8"
              tick={{ fill: "#8d96a8" }}
              tickFormatter={numberFormatter}
            />
            <Tooltip
              contentStyle={{
                background: "#101520",
                border: "1px solid #30384d",
                borderRadius: 8,
                color: "#f4f7fb",
              }}
              formatter={(value) => `${numberFormatter(Number(value))} kg`}
              labelStyle={{ color: "#b9c2d3" }}
            />
            <Legend wrapperStyle={{ color: "#b9c2d3" }} />
            <Line
              dataKey="totalVolume"
              dot
              name="Total volume"
              stroke="#a78bfa"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="workingVolume"
              dot
              name="Working volume"
              stroke="#a3e635"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="junkVolume"
              dot
              name="Junk volume"
              stroke="#f59e0b"
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
        <p>No progress evidence yet.</p>
      </section>
    );
  }

  return (
    <section className="section-block chart-section" aria-labelledby="progress-heading">
      <div className="section-heading">
        <h2 id="progress-heading">Progress evidence</h2>
      </div>
      <div className="chart-frame" aria-label="Pace and speed chart">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ top: 12, right: 24, bottom: 8, left: 8 }}
          >
            <CartesianGrid stroke="#273044" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#8d96a8" tick={{ fill: "#8d96a8" }} />
            <YAxis
              stroke="#8d96a8"
              tick={{ fill: "#8d96a8" }}
              tickFormatter={numberFormatter}
            />
            <Tooltip
              contentStyle={{
                background: "#101520",
                border: "1px solid #30384d",
                borderRadius: 8,
                color: "#f4f7fb",
              }}
              formatter={(value) => numberFormatter(Number(value))}
              labelStyle={{ color: "#b9c2d3" }}
            />
            <Legend wrapperStyle={{ color: "#b9c2d3" }} />
            <Line
              dataKey="pace"
              dot
              name="Pace min/km"
              stroke="#60a5fa"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="speed"
              dot
              name="Speed km/h"
              stroke="#a78bfa"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="distance"
              dot
              name="Distance km"
              stroke="#a3e635"
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
