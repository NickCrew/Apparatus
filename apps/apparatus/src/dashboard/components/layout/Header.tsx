import { useApparatus } from '../../providers/ApparatusProvider';
import { Bell, Search, Terminal } from 'lucide-react';
import { Button } from '../ui/Button';

interface HeaderProps {
  title?: string;
}

export function Header({}: HeaderProps) {
  const { health } = useApparatus();

  // Map health status to visual state
  const statusColor = health.status === 'healthy' 
    ? 'text-success-400' 
    : health.status === 'checking' 
      ? 'text-warning-400' 
      : 'text-danger-400';

  return (
    <header className="h-16 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 flex items-center justify-between px-6 z-10 sticky top-0">
      {/* Left: Breadcrumbs / Title */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center text-sm font-mono text-neutral-500">
          <span className="text-neutral-300">app</span>
          <span className="mx-2">/</span>
          <span className="text-primary-400">dashboard</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative hidden md:block group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 group-focus-within:text-primary-400 transition-colors" />
          <input 
            type="text" 
            placeholder="SEARCH COMMANDS..." 
            className="h-9 w-64 bg-neutral-900 border border-neutral-800 rounded-sm pl-9 pr-4 text-xs font-mono text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
             <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-neutral-700 bg-neutral-800 px-1.5 font-mono text-[10px] font-medium text-neutral-400 opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>

        <div className="h-6 w-px bg-neutral-800 mx-2" />

        {/* Status */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 text-xs font-mono ${statusColor}`}>
             <div className={`w-2 h-2 rounded-full ${statusColor === 'text-success-400' ? 'bg-success-500 shadow-[0_0_8px_rgba(0,255,148,0.6)]' : 'bg-current'}`} />
             <span className="uppercase">{health.status}</span>
          </div>
        </div>

        {/* Actions */}
        <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
          <Bell className="h-4 w-4" />
        </Button>
        
        <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
          <Terminal className="h-4 w-4" />
        </Button>

      </div>
    </header>
  );
}

Header.displayName = 'Header';