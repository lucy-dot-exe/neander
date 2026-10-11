interface Props<T extends string> {
  options: { value: T; label: string; disabled?: boolean; title?: string }[];
  value: T;
  onChange(value: T): void;
  label?: string;
  labelledBy?: string;
  small?: boolean;
}

/** A row of mutually exclusive buttons (a radio group). */
export function Segmented<T extends string>({ options, value, onChange, label, labelledBy, small }: Props<T>) {
  return (
    <div className={small ? 'seg sm' : 'seg'} role="radiogroup" aria-label={label} aria-labelledby={labelledBy}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          disabled={o.disabled}
          title={o.title}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
