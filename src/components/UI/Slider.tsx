import { forwardRef, type InputHTMLAttributes } from 'react';

export interface SliderProps extends InputHTMLAttributes<HTMLInputElement> {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onValueChange?: (value: number) => void;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ min = 0, max = 100, step = 1, value = 0, onValueChange, onChange, className = '', ...props }, ref) => (
    <input
      ref={ref}
      type="range"
      className={`obs-slider ${className}`}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => {
        onChange?.(e);
        onValueChange?.(Number(e.target.value));
      }}
      {...props}
    />
  )
);

Slider.displayName = 'Slider';