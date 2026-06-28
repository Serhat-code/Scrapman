"use client";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "number" | "password";
  min?: number;
  max?: number;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
}: TextFieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)]"
      />
    </div>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function TextAreaField({ label, value, onChange, placeholder, rows = 3 }: TextAreaFieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--emerald)]"
      />
    </div>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function CheckboxField({ label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-md border border-[var(--border)] px-3 py-2.5">
      <span className="text-sm text-[var(--text-primary)]">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[var(--emerald)]"
      />
    </label>
  );
}
