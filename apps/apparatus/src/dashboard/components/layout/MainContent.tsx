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
        'flex-1 overflow-y-auto overflow-x-hidden p-6 relative',
        'bg-neutral-950 bg-grid-pattern bg-[length:40px_40px]', // Grid background
        className
      )}
      role="main"
    >
      {/* Ambient Glow */}
      <div className="absolute top-0 left-0 w-full h-96 bg-primary-900/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      
      <div className="relative z-10 max-w-7xl mx-auto">
        {children}
      </div>
    </main>
  );
}

MainContent.displayName = 'MainContent';