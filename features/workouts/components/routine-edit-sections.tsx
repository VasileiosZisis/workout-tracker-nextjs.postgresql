"use client";

import { createContext, useContext, useId, useState, type ReactNode } from "react";

const EditStepsContext = createContext<ReactNode>(null);

export function RoutineEditSteps() {
  return useContext(EditStepsContext);
}

export function RoutineEditSections({ workouts, exercises, scheduling }: {
  workouts: ReactNode;
  exercises: ReactNode;
  scheduling: ReactNode;
}) {
  const [selected, setSelected] = useState(0);
  const id = useId();
  const sections = [
    { title: "Routine", content: workouts },
    { title: "Exercises", content: exercises },
    { title: "Scheduling", content: scheduling },
  ];

  const steps = (
    <ol className="routine-steps routine-edit-steps" aria-label="Edit routine sections">
      {sections.map(({ title }, index) => (
        <li key={title}>
          <button
            type="button"
            aria-pressed={index === selected}
            aria-controls={`${id}-${index}`}
            onClick={() => {
              setSelected(index);
              requestAnimationFrame(() => {
                document.getElementById(`${id}-${index}`)
                  ?.querySelector<HTMLButtonElement>(".routine-edit-steps [aria-pressed='true']")
                  ?.focus({ preventScroll: true });
              });
            }}
          >
            {index + 1}. {title}
          </button>
        </li>
      ))}
    </ol>
  );

  return (
    <EditStepsContext.Provider value={steps}>
      <div className="section-block narrow form-stack">
        {sections.map(({ title, content }, index) => (
          <section key={title} id={`${id}-${index}`} aria-label={title} hidden={index !== selected}>
            {content}
          </section>
        ))}
      </div>
    </EditStepsContext.Provider>
  );
}
