import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'neon' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const baseStyles = [
  'inline-flex items-center justify-center font-display font-semibold tracking-wide',
  'transition-all duration-150 ease-out',
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 focus-visible:ring-offset-neutral-950',
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
  'rounded-[3px]',
  'uppercase text-xs',
].join(' ');

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-500 hover:shadow-glow-primary border border-transparent',
  secondary: 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 border border-neutral-700',
  danger: 'bg-danger-600 text-white hover:bg-danger-500 hover:shadow-glow-danger border border-transparent',
  ghost: 'bg-transparent text-primary-400 hover:bg-primary-500/10 hover:text-primary-300',
  neon: 'bg-transparent border border-primary-500 text-primary-400 shadow-[0_0_10px_rgba(0,240,255,0.3)] hover:bg-primary-500/10 hover:shadow-glow-primary hover:text-primary-300',
  outline: 'bg-transparent border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-2',
  md: 'h-10 px-5 text-xs gap-2',
  lg: 'h-12 px-8 text-sm gap-3',
  icon: 'h-10 w-10 p-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    isLoading, 
    disabled, 
    className, 
    children, 
    leftIcon,
    rightIcon,
    ...props 
  }, ref) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && (
           <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
        )}
        {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';