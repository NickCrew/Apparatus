import { type HTMLAttributes } from 'react';
import { cn } from './cn';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';
type BadgeSize = 'sm' | 'md';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  success: 'bg-success-900/20 text-success-400 border-success-500/30 shadow-[0_0_10px_rgba(0,255,148,0.1)]',
  warning: 'bg-warning-900/20 text-warning-400 border-warning-500/30 shadow-[0_0_10px_rgba(255,184,0,0.1)]',
  danger: 'bg-danger-900/20 text-danger-400 border-danger-500/30 shadow-[0_0_10px_rgba(255,0,85,0.1)]',
  info: 'bg-info-900/20 text-info-400 border-info-500/30 shadow-[0_0_10px_rgba(0,163,255,0.1)]',
  neutral: 'bg-neutral-800 text-neutral-400 border-neutral-700',
  primary: 'bg-primary-900/20 text-primary-400 border-primary-500/30 shadow-[0_0_10px_rgba(0,240,255,0.1)]',
};

const sizes: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
  neutral: 'bg-neutral-500',
  primary: 'bg-primary-500',
};

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-medium rounded-sm border uppercase tracking-wider',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse', dotColors[variant])} />
      )}
      {children}
    </span>
  );
}

Badge.displayName = 'Badge';