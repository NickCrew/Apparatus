import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from './cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'panel' | 'outline' | 'glass';
  noPadding?: boolean;
}

const variants = {
  default: 'bg-neutral-900 border border-neutral-800',
  panel: 'bg-surface-panel border border-surface-border shadow-panel',
  outline: 'bg-transparent border border-neutral-800',
  glass: 'bg-neutral-900/60 backdrop-blur-md border border-white/5',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'panel', noPadding = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-sm overflow-hidden relative group', // Tech look: rounded-sm
          variants[variant],
          className
        )}
        {...props}
      >
        {/* Tech Corner Accent (Top Left) */}
        {variant === 'panel' && (
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
        
        {/* Tech Corner Accent (Bottom Right) */}
        {variant === 'panel' && (
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}

        <div className={cn('relative', !noPadding && 'p-5')}>
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
      className={cn('flex flex-col space-y-1.5 mb-4', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-base font-semibold font-mono tracking-tight text-neutral-100 uppercase', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-xs text-neutral-400 font-sans', className)}
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
      className={cn('flex items-center mt-4 pt-4 border-t border-neutral-800/50', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';