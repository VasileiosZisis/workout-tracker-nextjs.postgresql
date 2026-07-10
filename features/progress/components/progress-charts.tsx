"use client";

import { useState } from "react";
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
import type { ChartRangeState } from "../date-range";
import { ChartRangeControl } from "./chart-range-control";

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

function chartDot(color: string) {
  return {
    r: 4,
    fill: chartColors.surface,
    stroke: color,
    strokeWidth: 2,
  };
}

function activeChartDot(color: string) {
  return {
    r: 6,
    fill: color,
    stroke: "#f4f7fb",
    strokeWidth: 2,
  };
}

export function WeightliftingProgressChart({
  data,
  range,
}: {
  data: WeightliftingProgressPoint[];
  range: ChartRangeState;
}) {
  const [visibleSeries, setVisibleSeries] = useState({
    junkVolume: true,
    totalVolume: true,
    workingVolume: true,
  });

  function toggleSeries(series: keyof typeof visibleSeries) {
    setVisibleSeries((current) => ({
      ...current,
      [series]: !current[series],
    }));
  }

  if (data.length === 0) {
    return (
      <section className="section-block chart-section" aria-labelledby="progress-heading">
        <div className="section-heading">
          <div>
            <h2 id="progress-heading">Volume Over Time</h2>
            <ChartRangeControl range={range} />
          </div>
        </div>
        <div className="empty-state">
          <div>
            <h2>No volume data yet</h2>
            <p>Charts appear after the first recorded session.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-block chart-section" aria-labelledby="progress-heading">
      <div className="section-heading">
        <div>
          <h2 id="progress-heading">Volume Over Time</h2>
          <ChartRangeControl range={range} />
          <div
            className="chart-series-controls"
            aria-label="Chart series"
            role="group"
          >
            <label className="chart-series-toggle chart-series-violet">
              <input
                checked={visibleSeries.totalVolume}
                onChange={() => toggleSeries("totalVolume")}
                type="checkbox"
              />
              <span>Total volume</span>
            </label>
            <label className="chart-series-toggle chart-series-lime">
              <input
                checked={visibleSeries.workingVolume}
                onChange={() => toggleSeries("workingVolume")}
                type="checkbox"
              />
              <span>Working volume</span>
            </label>
            <label className="chart-series-toggle chart-series-amber">
              <input
                checked={visibleSeries.junkVolume}
                onChange={() => toggleSeries("junkVolume")}
                type="checkbox"
              />
              <span>Junk volume</span>
            </label>
          </div>
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
            {visibleSeries.totalVolume ? (
              <Line
                activeDot={activeChartDot(chartColors.violet)}
                dataKey="totalVolume"
                dot={chartDot(chartColors.violet)}
                name="Total volume"
                stroke={chartColors.violet}
                strokeWidth={2.5}
                type="monotone"
              />
            ) : null}
            {visibleSeries.workingVolume ? (
              <Line
                activeDot={activeChartDot(chartColors.lime)}
                dataKey="workingVolume"
                dot={chartDot(chartColors.lime)}
                name="Working volume"
                stroke={chartColors.lime}
                strokeWidth={3}
                type="monotone"
              />
            ) : null}
            {visibleSeries.junkVolume ? (
              <Line
                activeDot={activeChartDot(chartColors.amber)}
                dataKey="junkVolume"
                dot={chartDot(chartColors.amber)}
                name="Junk volume"
                stroke={chartColors.amber}
                strokeWidth={2.5}
                type="monotone"
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data-disclosure">
        <summary>Chart Data</summary>
        <div className="chart-table-wrap">
          <table className="data-table chart-table">
            <caption>Chart Data</caption>
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
      </details>
    </section>
  );
}

export function PaceProgressChart({
  data,
  range,
}: {
  data: PaceProgressPoint[];
  range: ChartRangeState;
}) {
  const [visibleSeries, setVisibleSeries] = useState({
    distance: true,
    pace: true,
    speed: true,
  });

  function toggleSeries(series: keyof typeof visibleSeries) {
    setVisibleSeries((current) => ({
      ...current,
      [series]: !current[series],
    }));
  }

  if (data.length === 0) {
    return (
      <section className="section-block chart-section" aria-labelledby="progress-heading">
        <div className="section-heading">
          <div>
            <h2 id="progress-heading">Pace and Speed Over Time</h2>
            <ChartRangeControl range={range} />
          </div>
        </div>
        <div className="empty-state">
          <div>
            <h2>No pace or speed data yet</h2>
            <p>Charts appear after the first recorded session.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-block chart-section" aria-labelledby="progress-heading">
      <div className="section-heading">
        <div>
          <h2 id="progress-heading">Pace and Speed Over Time</h2>
          <ChartRangeControl range={range} />
          <div
            className="chart-series-controls"
            aria-label="Chart series"
            role="group"
          >
            <label className="chart-series-toggle chart-series-lime">
              <input
                checked={visibleSeries.distance}
                onChange={() => toggleSeries("distance")}
                type="checkbox"
              />
              <span>Distance</span>
            </label>
            <label className="chart-series-toggle chart-series-blue">
              <input
                checked={visibleSeries.pace}
                onChange={() => toggleSeries("pace")}
                type="checkbox"
              />
              <span>Pace</span>
            </label>
            <label className="chart-series-toggle chart-series-violet">
              <input
                checked={visibleSeries.speed}
                onChange={() => toggleSeries("speed")}
                type="checkbox"
              />
              <span>Speed</span>
            </label>
          </div>
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
            {visibleSeries.pace ? (
              <Line
                activeDot={activeChartDot(chartColors.blue)}
                dataKey="pace"
                dot={chartDot(chartColors.blue)}
                name="Pace min/km"
                stroke={chartColors.blue}
                strokeWidth={3}
                type="monotone"
              />
            ) : null}
            {visibleSeries.speed ? (
              <Line
                activeDot={activeChartDot(chartColors.violet)}
                dataKey="speed"
                dot={chartDot(chartColors.violet)}
                name="Speed km/h"
                stroke={chartColors.violet}
                strokeWidth={2.5}
                type="monotone"
              />
            ) : null}
            {visibleSeries.distance ? (
              <Line
                activeDot={activeChartDot(chartColors.lime)}
                dataKey="distance"
                dot={chartDot(chartColors.lime)}
                name="Distance km"
                stroke={chartColors.lime}
                strokeWidth={2.5}
                type="monotone"
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data-disclosure">
        <summary>Chart Data</summary>
        <div className="chart-table-wrap">
          <table className="data-table chart-table">
            <caption>Chart Data</caption>
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
      </details>
    </section>
  );
}
