"use client";

import { Fragment, useState } from "react";
import {
  Bar,
  BarChart,
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
import {
  formatPaceSeconds,
  getPaddedDomain,
  type PaceChartMetric,
} from "../pace-progress";
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

const weightliftingVolumeSeriesOrder: Record<string, number> = {
  junkVolume: 0,
  workingVolume: 1,
  totalVolume: 2,
  averageWorkingLoad: 3,
};

function numberFormatter(value: number) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
  }).format(value);
}

const axisTick = {
  fill: chartColors.muted,
  fontSize: 12,
};

const blueAxisTick = {
  ...axisTick,
  fill: chartColors.blue,
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

type WeightliftingVolumeTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{
    payload?: WeightliftingProgressPoint;
  }>;
};

function WeightliftingVolumeTooltip({
  active,
  label,
  payload,
}: WeightliftingVolumeTooltipProps) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="chart-volume-tooltip">
      <div className="chart-volume-tooltip-date">{label ?? point.date}</div>
      <div className="chart-volume-tooltip-totals">
        <strong className="chart-volume-tooltip-junk">
          {numberFormatter(point.junkVolume)} kg
        </strong>
        <strong className="chart-volume-tooltip-working">
          {numberFormatter(point.workingVolume)} kg
        </strong>
        <strong className="chart-volume-tooltip-total">
          {numberFormatter(point.totalVolume)} kg
        </strong>
        <strong className="chart-volume-tooltip-average-load">
          {point.averageWorkingLoad === null
            ? "—"
            : `${numberFormatter(point.averageWorkingLoad)} kg`}
        </strong>
      </div>
      <div className="chart-volume-tooltip-sets">
        {point.sets.map((set) => (
          <div
            className="chart-volume-tooltip-set-row"
            key={`${point.id}-${set.position}`}
          >
            <span>Set {set.position}</span>
            <span>{numberFormatter(set.repetitions)} reps</span>
            <span>{numberFormatter(set.kilograms)} kg</span>
            <span>{set.type}</span>
            <span>{numberFormatter(set.volume)} kg</span>
            <span>
              Avg load{" "}
              {set.averageWorkingLoad === null
                ? "—"
                : `${numberFormatter(set.averageWorkingLoad)} kg`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type PaceSessionTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{
    payload?: PaceProgressPoint;
  }>;
};

function PaceSessionTooltip({
  active,
  label,
  payload,
}: PaceSessionTooltipProps) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="chart-pace-tooltip">
      <div className="chart-pace-tooltip-date">{label ?? point.date}</div>
      <div className="chart-pace-tooltip-row">
        <span>
          <strong className="chart-pace-tooltip-time">{point.time}</strong>
        </span>
        <span>
          <strong className="chart-pace-tooltip-distance">
            {numberFormatter(point.distance)} km
          </strong>
        </span>
      </div>
      <div className="chart-pace-tooltip-row">
        <span>
          <strong className="chart-pace-tooltip-pace">
            {formatPaceSeconds(point.paceSecondsPerKm)} min/km
          </strong>
        </span>
        <span>
          <strong className="chart-pace-tooltip-speed">
            {numberFormatter(point.speed)} km/h
          </strong>
        </span>
      </div>
    </div>
  );
}

export function WeightliftingProgressChart({
  data,
  range,
}: {
  data: WeightliftingProgressPoint[];
  range: ChartRangeState;
}) {
  const [visibleSeries, setVisibleSeries] = useState({
    averageWorkingLoad: true,
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
            <h2 id="progress-heading">Volume and Average Load Over Time</h2>
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

  const averageWorkingLoadDomain = getPaddedDomain(
    data.flatMap((point) =>
      point.averageWorkingLoad === null ? [] : [point.averageWorkingLoad],
    ),
    2.5,
  );

  return (
    <section className="section-block chart-section" aria-labelledby="progress-heading">
      <div className="section-heading">
        <div>
          <h2 id="progress-heading">Volume and Average Load Over Time</h2>
          <ChartRangeControl range={range} />
          <div
            className="chart-series-controls"
            aria-label="Chart series"
            role="group"
          >
            <label className="chart-series-toggle chart-series-amber">
              <input
                checked={visibleSeries.junkVolume}
                onChange={() => toggleSeries("junkVolume")}
                type="checkbox"
              />
              <span>Junk volume</span>
            </label>
            <label className="chart-series-toggle chart-series-lime">
              <input
                checked={visibleSeries.workingVolume}
                onChange={() => toggleSeries("workingVolume")}
                type="checkbox"
              />
              <span>Working volume</span>
            </label>
            <label className="chart-series-toggle chart-series-violet">
              <input
                checked={visibleSeries.totalVolume}
                onChange={() => toggleSeries("totalVolume")}
                type="checkbox"
              />
              <span>Total volume</span>
            </label>
            <label className="chart-series-toggle chart-series-blue">
              <input
                checked={visibleSeries.averageWorkingLoad}
                onChange={() => toggleSeries("averageWorkingLoad")}
                type="checkbox"
              />
              <span>Average working load per rep</span>
            </label>
          </div>
        </div>
      </div>
      <div
        className="chart-frame"
        aria-label="Weightlifting volume and average load chart"
      >
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
            {visibleSeries.averageWorkingLoad ? (
              <YAxis
                axisLine={false}
                domain={averageWorkingLoadDomain}
                orientation="right"
                stroke={chartColors.blue}
                tick={blueAxisTick}
                tickFormatter={numberFormatter}
                tickLine={false}
                tickMargin={8}
                width={58}
                yAxisId="averageWorkingLoad"
              />
            ) : null}
            <Tooltip
              allowEscapeViewBox={{ x: false, y: true }}
              content={<WeightliftingVolumeTooltip />}
              wrapperStyle={{ zIndex: 10 }}
            />
            <Legend
              iconType="circle"
              itemSorter={(item) =>
                weightliftingVolumeSeriesOrder[String(item.dataKey)] ?? 3
              }
              wrapperStyle={{ color: chartColors.mutedStrong, paddingTop: 8 }}
            />
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
            {visibleSeries.averageWorkingLoad ? (
              <Line
                activeDot={activeChartDot(chartColors.blue)}
                connectNulls={false}
                dataKey="averageWorkingLoad"
                dot={chartDot(chartColors.blue)}
                name="Average working load per rep"
                stroke={chartColors.blue}
                strokeDasharray="6 4"
                strokeWidth={2.5}
                type="monotone"
                yAxisId="averageWorkingLoad"
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
            <tbody>
              {[...data].reverse().map((point) => (
                <Fragment key={point.id}>
                  <tr className="chart-session-row">
                    <td>{point.date}</td>
                    <td>Junk Volume {numberFormatter(point.junkVolume)} kg</td>
                    <td>
                      Working Volume {numberFormatter(point.workingVolume)} kg
                    </td>
                    <td>Total Volume {numberFormatter(point.totalVolume)} kg</td>
                    <td>
                      Average Load per Rep{" "}
                      {point.averageWorkingLoad === null
                        ? "—"
                        : `${numberFormatter(point.averageWorkingLoad)} kg`}
                    </td>
                  </tr>
                  {point.sets.map((set) => (
                    <tr
                      className="chart-set-row"
                      key={`${point.id}-${set.position}`}
                    >
                      <td colSpan={5}>
                        <div className="chart-set-details">
                          <span>Set {set.position}</span>
                          <span>{numberFormatter(set.repetitions)} reps</span>
                          <span>{numberFormatter(set.kilograms)} kg</span>
                          <span>{set.type}</span>
                          <span>{numberFormatter(set.volume)} kg</span>
                          <span>
                            Avg load{" "}
                            {set.averageWorkingLoad === null
                              ? "—"
                              : `${numberFormatter(set.averageWorkingLoad)} kg`}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
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
  const [selectedMetric, setSelectedMetric] =
    useState<PaceChartMetric>("pace");

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
            <h2>No cardio data yet</h2>
            <p>Charts appear after the first recorded session.</p>
          </div>
        </div>
      </section>
    );
  }

  const isPace = selectedMetric === "pace";
  const performanceDomain = getPaddedDomain(
    data.map((point) =>
      isPace ? point.paceSecondsPerKm : point.speed,
    ),
    isPace ? 10 : 0.1,
  );
  const performanceTitle = isPace ? "Pace over time" : "Speed over time";

  return (
    <section className="section-block chart-section" aria-labelledby="progress-heading">
      <div className="section-heading">
        <div>
          <h2 id="progress-heading">Pace and Speed Over Time</h2>
          <ChartRangeControl range={range} />
          <div
            aria-label="Performance metric"
            className="chart-metric-selector"
            role="radiogroup"
          >
            <div className="chart-metric-options">
              <label>
                <input
                  checked={selectedMetric === "pace"}
                  name="cardio-chart-metric"
                  onChange={() => setSelectedMetric("pace")}
                  type="radio"
                  value="pace"
                />
                <span>Pace</span>
              </label>
              <label>
                <input
                  checked={selectedMetric === "speed"}
                  name="cardio-chart-metric"
                  onChange={() => setSelectedMetric("speed")}
                  type="radio"
                  value="speed"
                />
                <span>Speed</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      <div
        className="chart-frame chart-frame-performance"
        aria-label={`${performanceTitle} chart`}
      >
        <ResponsiveContainer width="100%" height={280}>
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
                domain={performanceDomain}
                reversed={isPace}
                stroke={chartColors.muted}
                tick={axisTick}
                tickFormatter={(value) =>
                  isPace
                    ? formatPaceSeconds(Number(value))
                    : numberFormatter(Number(value))
                }
                tickLine={false}
                tickMargin={8}
                width={isPace ? 54 : 48}
              />
              <Tooltip
                allowEscapeViewBox={{ x: false, y: true }}
                content={<PaceSessionTooltip />}
                wrapperStyle={{ zIndex: 10 }}
              />
              {isPace ? (
                <Line
                  activeDot={activeChartDot(chartColors.blue)}
                  dataKey="paceSecondsPerKm"
                  dot={chartDot(chartColors.blue)}
                  name="Pace min/km"
                  stroke={chartColors.blue}
                  strokeWidth={3}
                  type="monotone"
                />
              ) : (
                <Line
                  activeDot={activeChartDot(chartColors.violet)}
                  dataKey="speed"
                  dot={chartDot(chartColors.violet)}
                  name="Speed km/h"
                  stroke={chartColors.violet}
                  strokeWidth={2.5}
                  type="monotone"
                />
              )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <h3 className="progress-heading" id="distance-progress-heading">
        Distance per session
      </h3>
      <div
        className="chart-frame chart-frame-distance"
        aria-labelledby="distance-progress-heading"
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
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
                domain={[0, "auto"]}
                stroke={chartColors.muted}
                tick={axisTick}
                tickFormatter={numberFormatter}
                tickLine={false}
                tickMargin={8}
                width={48}
              />
              <Tooltip
                allowEscapeViewBox={{ x: false, y: true }}
                content={<PaceSessionTooltip />}
                wrapperStyle={{ zIndex: 10 }}
              />
              <Bar
                dataKey="distance"
                fill={chartColors.lime}
                maxBarSize={54}
                name="Distance km"
                radius={[5, 5, 0, 0]}
              />
          </BarChart>
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
                <th>Time</th>
                <th>Distance</th>
                <th>Pace</th>
                <th>Speed</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((point) => (
                <tr key={point.id}>
                  <td>{point.date}</td>
                  <td>{point.time}</td>
                  <td>{numberFormatter(point.distance)} km</td>
                  <td>{formatPaceSeconds(point.paceSecondsPerKm)} min/km</td>
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
