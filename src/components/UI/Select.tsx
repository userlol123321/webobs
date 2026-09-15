import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';

interface Option {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: Option[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, className = '', ...props }, ref) => (
    <select ref={ref} className={`obs-select ${className}`} {...props}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
);

Select.displayName = 'Select';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  unit?: string;
}

export const NumberInput = forwardRef<HTMLInputElement, FieldProps>(
  ({ unit, className = '', ...props }, ref) => (
    <div className="obs-number">
      <input ref={ref} type="number" className={`obs-input obs-input--number ${className}`} {...props} />
      {unit && <span className="obs-number-unit">{unit}</span>}
    </div>
  )
);

NumberInput.displayName = 'NumberInput';