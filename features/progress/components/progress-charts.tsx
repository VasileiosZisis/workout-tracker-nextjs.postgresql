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

const chartColors = {
  amber: "#f59e0b",
  blue: "#60a5fa",
  grid: "#273044",
  lime: "#a3e635",
  muted: "#8d96a8",
  mutedStrong: "#b9c2d3",
  surface: "#101520",
  violet: "#a78bfa",
};

function numberFormatter(value: number) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
  }).format(value);
}

const tooltipStyle = {
  background: chartColors.surface,
  border: "1px solid #30384d",
  borderRadius: 8,
  color: "#f4f7fb",
};

const axisTick = {
  fill: chartColors.muted,
  fontSize: 12,
};

export function WeightliftingProgressChart({
  data,
}: {
  data: WeightliftingProgressPoint[];
}) {
  if (data.length === 0) {
    return (
      <section className="empty-state section-block">
        <div>
          <h2>No progress evidence yet</h2>
          <p>Charts appear after the first recorded session.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-block chart-section" aria-labelledby="progress-heading">
      <div className="section-heading">
        <div>
          <h2 id="progress-heading">Progress evidence</h2>
          <p>Volume trend by recorded session. Working volume is the primary signal.</p>
        </div>
      </div>
      <div className="chart-frame" aria-label="Weightlifting volume chart">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ top: 12, right: 18, bottom: 8, left: 0 }}
          >
            <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
            <XAxis
              axisLine={false}
              dataKey="date"
              minTickGap={24}
              stroke={chartColors.muted}
              tick={axisTick}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              axisLine={false}
              stroke={chartColors.muted}
              tick={axisTick}
              tickFormatter={numberFormatter}
              tickLine={false}
              tickMargin={8}
              width={58}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => `${numberFormatter(Number(value))} kg`}
              labelStyle={{ color: chartColors.mutedStrong }}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ color: chartColors.mutedStrong, paddingTop: 8 }}
            />
            <Line
              activeDot={{ r: 5 }}
              dataKey="totalVolume"
              dot={false}
              name="Total volume"
              stroke={chartColors.violet}
              strokeWidth={2.5}
              type="monotone"
            />
            <Line
              activeDot={{ r: 5 }}
              dataKey="workingVolume"
              dot={false}
              name="Working volume"
              stroke={chartColors.lime}
              strokeWidth={3}
              type="monotone"
            />
            <Line
              activeDot={{ r: 5 }}
              dataKey="junkVolume"
              dot={false}
              name="Junk volume"
              stroke={chartColors.amber}
              strokeWidth={2.5}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-table-wrap">
        <table className="data-table chart-table">
          <caption>Weightlifting chart data</caption>
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
      </div>
    </section>
  );
}

export function PaceProgressChart({ data }: { data: PaceProgressPoint[] }) {
  if (data.length === 0) {
    return (
      <section className="empty-state section-block">
        <div>
          <h2>No progress evidence yet</h2>
          <p>Charts appear after the first recorded session.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-block chart-section" aria-labelledby="progress-heading">
      <div className="section-heading">
        <div>
          <h2 id="progress-heading">Progress evidence</h2>
          <p>Pace and speed trend by recorded session. Lower pace means faster effort.</p>
        </div>
      </div>
      <div className="chart-frame" aria-label="Pace and speed chart">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ top: 12, right: 18, bottom: 8, left: 0 }}
          >
            <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
            <XAxis
              axisLine={false}
              dataKey="date"
              minTickGap={24}
              stroke={chartColors.muted}
              tick={axisTick}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              axisLine={false}
              stroke={chartColors.muted}
              tick={axisTick}
              tickFormatter={numberFormatter}
              tickLine={false}
              tickMargin={8}
              width={48}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => numberFormatter(Number(value))}
              labelStyle={{ color: chartColors.mutedStrong }}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ color: chartColors.mutedStrong, paddingTop: 8 }}
            />
            <Line
              activeDot={{ r: 5 }}
              dataKey="pace"
              dot={false}
              name="Pace min/km"
              stroke={chartColors.blue}
              strokeWidth={3}
              type="monotone"
            />
            <Line
              activeDot={{ r: 5 }}
              dataKey="speed"
              dot={false}
              name="Speed km/h"
              stroke={chartColors.violet}
              strokeWidth={2.5}
              type="monotone"
            />
            <Line
              activeDot={{ r: 5 }}
              dataKey="distance"
              dot={false}
              name="Distance km"
              stroke={chartColors.lime}
              strokeWidth={2.5}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-table-wrap">
        <table className="data-table chart-table">
          <caption>Pace chart data</caption>
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
      </div>
    </section>
  );
}
