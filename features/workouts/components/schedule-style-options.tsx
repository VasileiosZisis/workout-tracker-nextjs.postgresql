const options = [
  ["CONTINUOUS", "Continue where I left off", "Your next workout waits until you finish it."],
  ["WEEKLY", "Restart each week", "Begin the ordered list again each new week."],
  ["FIXED", "Train on specific weekdays", "Give each training day its own workout."],
] as const;

export function ScheduleStyleOptions({ name, value, onChange, disabled }: {
  name: string;
  value: string;
  onChange: (style: typeof options[number][0]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="form-stack" role="group" aria-label="Scheduling style">
      {options.map(([style, title, description]) => (
        <label className="radio-row radio-option routine-schedule-choice" key={style}>
          <input
            type="radio"
            name={name}
            value={style}
            checked={value === style}
            onChange={() => onChange(style)}
            disabled={disabled}
          />
          <span><strong>{title}</strong><span className="field-help">{description}</span></span>
        </label>
      ))}
    </div>
  );
}
