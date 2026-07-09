export const CHART_RANGE_OPTIONS = [
  { label: "Last 4 weeks", value: "4w" },
  { label: "Last 8 weeks", value: "8w" },
  { label: "Last 12 weeks", value: "12w" },
  { label: "Last 6 months", value: "6m" },
  { label: "Last year", value: "1y" },
  { label: "YTD", value: "ytd" },
  { label: "Custom date range", value: "custom" },
] as const;

export type ChartRange = (typeof CHART_RANGE_OPTIONS)[number]["value"];

export type ChartRangeSearchParams = {
  chartFrom?: string | string[];
  chartRange?: string | string[];
  chartTo?: string | string[];
};

export type ChartRangeState = {
  chartFrom: string;
  chartRange: ChartRange;
  chartTo: string;
};

const DEFAULT_CHART_RANGE: ChartRange = "6m";
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isChartRange(value: string | undefined): value is ChartRange {
  return CHART_RANGE_OPTIONS.some((option) => option.value === value);
}

export function isDateInputValue(value: string | undefined): value is string {
  if (!value || !DATE_INPUT_PATTERN.test(value)) {
    return false;
  }

  return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

export function parseChartRangeSearchParams(
  searchParams: ChartRangeSearchParams,
): ChartRangeState {
  const chartRange = firstParam(searchParams.chartRange);
  const chartFrom = firstParam(searchParams.chartFrom);
  const chartTo = firstParam(searchParams.chartTo);

  return {
    chartFrom: isDateInputValue(chartFrom) ? chartFrom : "",
    chartRange: isChartRange(chartRange) ? chartRange : DEFAULT_CHART_RANGE,
    chartTo: isDateInputValue(chartTo) ? chartTo : "",
  };
}

function addUtcDays(date: Date, days: number) {
  const nextDate = new Date(date);

  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

function addUtcMonths(date: Date, months: number) {
  const nextDate = new Date(date);

  nextDate.setUTCMonth(nextDate.getUTCMonth() + months);

  return nextDate;
}

function addUtcYears(date: Date, years: number) {
  const nextDate = new Date(date);

  nextDate.setUTCFullYear(nextDate.getUTCFullYear() + years);

  return nextDate;
}

function dateInputToUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function getChartDateRange({
  latestPerformedAt,
  range,
}: {
  latestPerformedAt: Date | null;
  range: ChartRangeState;
}) {
  if (!latestPerformedAt) {
    return null;
  }

  const latestDate = dateInputToUtcDate(latestPerformedAt.toISOString().slice(0, 10));
  const customFrom = isDateInputValue(range.chartFrom)
    ? dateInputToUtcDate(range.chartFrom)
    : null;
  const customTo = isDateInputValue(range.chartTo)
    ? dateInputToUtcDate(range.chartTo)
    : null;

  if (
    range.chartRange === "custom" &&
    customFrom &&
    customTo &&
    customFrom <= customTo
  ) {
    return {
      from: customFrom,
      toExclusive: addUtcDays(customTo, 1),
    };
  }

  if (range.chartRange === "4w") {
    return {
      from: addUtcDays(latestDate, -28),
      toExclusive: addUtcDays(latestDate, 1),
    };
  }

  if (range.chartRange === "8w") {
    return {
      from: addUtcDays(latestDate, -56),
      toExclusive: addUtcDays(latestDate, 1),
    };
  }

  if (range.chartRange === "12w") {
    return {
      from: addUtcDays(latestDate, -84),
      toExclusive: addUtcDays(latestDate, 1),
    };
  }

  if (range.chartRange === "1y") {
    return {
      from: addUtcYears(latestDate, -1),
      toExclusive: addUtcDays(latestDate, 1),
    };
  }

  if (range.chartRange === "ytd") {
    return {
      from: new Date(Date.UTC(latestDate.getUTCFullYear(), 0, 1)),
      toExclusive: addUtcDays(latestDate, 1),
    };
  }

  return {
    from: addUtcMonths(latestDate, -6),
    toExclusive: addUtcDays(latestDate, 1),
  };
}
