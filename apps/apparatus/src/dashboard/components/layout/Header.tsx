import { useApparatus } from '../../providers/ApparatusProvider';
import { Bell, Search, Terminal } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';

interface HeaderProps {
  title?: string;
}

export function Header({}: HeaderProps) {
  const { health } = useApparatus();
  const isHealthy = health.status === 'healthy';

  return (
    <header className="h-12 bg-neutral-950/90 backdrop-blur-lg border-b border-neutral-800/40 flex items-center justify-between px-5 z-10 sticky top-0">
      {/* Left: Breadcrumb */}
      <div className="hidden md:flex items-center gap-1.5 text-xs">
        <span className="font-sans text-neutral-600">apparatus</span>
        <span className="text-neutral-700">/</span>
        <span className="font-sans text-neutral-400">dashboard</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-600 group-focus-within:text-primary-500/70 transition-colors" />
          <input
            type="text"
            placeholder="Search..."
            className="h-8 w-52 bg-neutral-900/60 border border-neutral-800/60 rounded-[3px] pl-8 pr-12 text-xs font-sans text-neutral-300 placeholder:text-neutral-700 focus:outline-none focus:border-primary-500/30 focus:bg-neutral-900 transition-all"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 h-[18px] inline-flex items-center gap-0.5 rounded-[2px] border border-neutral-800 bg-neutral-900 px-1 font-mono text-[9px] text-neutral-600">
            <span className="text-[10px]">⌘</span>K
          </kbd>
        </div>

        <div className="h-5 w-px bg-neutral-800/50" />

        {/* Health indicator */}
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            isHealthy ? "bg-success-500 shadow-[0_0_6px_rgba(0,255,148,0.5)]" : "bg-danger-500"
          )} />
          <span className={cn(
            "text-[11px] font-mono",
            isHealthy ? "text-success-500/80" : "text-danger-400"
          )}>
            {health.status === 'healthy' ? 'OK' : health.status === 'checking' ? '...' : 'ERR'}
          </span>
          {health.latencyMs !== undefined && (
            <span className="text-[10px] font-mono text-neutral-700">{health.latencyMs}ms</span>
          )}
        </div>

        <div className="h-5 w-px bg-neutral-800/50" />

        <Button variant="ghost" size="icon" className="text-neutral-600 hover:text-neutral-300 h-8 w-8">
          <Bell className="h-3.5 w-3.5" />
        </Button>

        <Button variant="ghost" size="icon" className="text-neutral-600 hover:text-neutral-300 h-8 w-8">
          <Terminal className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  );
}

Header.displayName = 'Header';
