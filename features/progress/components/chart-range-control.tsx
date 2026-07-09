"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CHART_RANGE_OPTIONS,
  isDateInputValue,
  type ChartRange,
  type ChartRangeState,
} from "../date-range";

function isCompleteCustomRange(chartFrom: string, chartTo: string) {
  return (
    isDateInputValue(chartFrom) &&
    isDateInputValue(chartTo) &&
    chartFrom <= chartTo
  );
}

function getFormValue(form: HTMLFormElement | null, name: string) {
  if (!form) {
    return "";
  }

  return String(new FormData(form).get(name) ?? "");
}

export function ChartRangeControl({
  range,
}: Readonly<{
  range: ChartRangeState;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateUrl(nextParams: {
    chartFrom?: string;
    chartRange: ChartRange;
    chartTo?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    params.set("chartRange", nextParams.chartRange);

    if (nextParams.chartRange === "custom") {
      if (nextParams.chartFrom) {
        params.set("chartFrom", nextParams.chartFrom);
      } else {
        params.delete("chartFrom");
      }

      if (nextParams.chartTo) {
        params.set("chartTo", nextParams.chartTo);
      } else {
        params.delete("chartTo");
      }
    } else {
      params.delete("chartFrom");
      params.delete("chartTo");
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  function updateCustomRange(nextFrom: string, nextTo: string) {
    if (!isCompleteCustomRange(nextFrom, nextTo)) {
      return;
    }

    updateUrl({
      chartFrom: nextFrom,
      chartRange: "custom",
      chartTo: nextTo,
    });
  }

  return (
    <form
      className="chart-range-control"
      key={`${range.chartRange}-${range.chartFrom}-${range.chartTo}`}
      onSubmit={(event) => event.preventDefault()}
    >
      <label className="chart-range-field">
        <span>Range</span>
        <select
          name="chartRange"
          onChange={(event) => {
            const nextRange = event.currentTarget.value as ChartRange;

            updateUrl({
              chartFrom: getFormValue(event.currentTarget.form, "chartFrom"),
              chartRange: nextRange,
              chartTo: getFormValue(event.currentTarget.form, "chartTo"),
            });
          }}
          value={range.chartRange}
        >
          {CHART_RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {range.chartRange === "custom" ? (
        <div className="chart-range-custom">
          <label className="chart-range-field">
            <span>From</span>
            <input
              defaultValue={range.chartFrom}
              name="chartFrom"
              onChange={(event) => {
                const nextFrom = event.currentTarget.value;

                updateCustomRange(
                  nextFrom,
                  getFormValue(event.currentTarget.form, "chartTo"),
                );
              }}
              type="date"
            />
          </label>
          <label className="chart-range-field">
            <span>To</span>
            <input
              defaultValue={range.chartTo}
              name="chartTo"
              onChange={(event) => {
                const nextTo = event.currentTarget.value;

                updateCustomRange(
                  getFormValue(event.currentTarget.form, "chartFrom"),
                  nextTo,
                );
              }}
              type="date"
            />
          </label>
        </div>
      ) : null}
    </form>
  );
}
