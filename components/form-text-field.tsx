import type { ComponentPropsWithoutRef, ReactNode } from "react";

type FormTextFieldProps = Omit<ComponentPropsWithoutRef<"input">, "children" | "id" | "type"> & {
  id: string;
  label: string;
  help?: string;
  error?: string;
  children?: ReactNode;
};

export function FormTextField({ id, label, help, error, children, ...input }: FormTextFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input {...input} id={id} type="text" />
      {help ? <p className="field-help">{help}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {children}
    </div>
  );
}
