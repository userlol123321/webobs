import { forwardRef, type ButtonHTMLAttributes } from 'react';
import './ui.css';

export type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', className = '', ...props }, ref) => (
    <button ref={ref} className={`obs-btn obs-btn--${variant} ${className}`} {...props} />
  )
);

Button.displayName = 'Button';