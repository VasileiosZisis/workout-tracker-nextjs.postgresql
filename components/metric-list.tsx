export type MetricListItem = {
  label: string;
  value: string | number;
  unit?: string;
  tone: "lime" | "amber" | "blue" | "violet";
};

type MetricListProps = {
  items: readonly MetricListItem[];
  variant?: "standard" | "compact";
};

export function MetricList({ items, variant = "standard" }: MetricListProps) {
  return (
    <div className={`metric-list-region metric-list-region-${variant}`}>
      <dl
        className={`metric-list metric-list-${items.length === 3 ? "three" : "four"}`}
      >
        {items.map(({ label, value, unit, tone }) => {
          // Keep existing feature formatters while styling their units separately.
          const suffix = unit ? ` ${unit}` : "";
          const displayValue =
            suffix && typeof value === "string" && value.endsWith(suffix)
              ? value.slice(0, -suffix.length)
              : value;

          return (
            <div className={`metric-list-item metric-list-item-${tone}`} key={label}>
              <dt>{label}</dt>
              <dd>
                <span>{displayValue}</span>
                {unit && value !== "—" ? (
                  <>
                    {" "}
                    <span className="metric-list-unit">{unit}</span>
                  </>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
