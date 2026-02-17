import { type ReactNode } from 'react';
import { cn } from '../ui/cn';

interface MainContentProps {
  children: ReactNode;
  className?: string;
}

export function MainContent({ children, className }: MainContentProps) {
  return (
    <main
      className={cn(
        'flex-1 overflow-y-auto overflow-x-hidden p-5 relative',
        'bg-neutral-950 bg-grid-pattern bg-[length:48px_48px]',
        className
      )}
      role="main"
    >
      {/* Primary ambient glow — cyan, top-left */}
      <div className="absolute top-0 left-0 w-[500px] h-[400px] bg-primary-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

      {/* Secondary ambient — warm accent, bottom-right */}
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-warning-500/[0.01] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-[1400px] mx-auto">
        {children}
      </div>
    </main>
  );
}

MainContent.displayName = 'MainContent';
