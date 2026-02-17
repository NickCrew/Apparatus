import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from './cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'panel' | 'outline' | 'glass';
  noPadding?: boolean;
}

const variants = {
  default: 'bg-neutral-900/70 border border-neutral-800/60 shadow-inner-glow',
  panel: 'bg-neutral-950/80 border border-neutral-800/50 shadow-panel',
  outline: 'bg-transparent border border-neutral-800/50',
  glass: 'bg-neutral-900/40 backdrop-blur-md border border-white/[0.04] shadow-inner-glow',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'panel', noPadding = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[3px] overflow-hidden relative group',
          variants[variant],
          className
        )}
        {...props}
      >
        <div className={cn('relative', !noPadding && 'p-4')}>
          {children}
        </div>
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1 mb-3', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-display-sm font-display tracking-wide text-neutral-200 uppercase', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-xs text-neutral-500 font-sans', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center mt-3 pt-3 border-t border-neutral-800/40', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';
