import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Shield,
  Zap,
  Network,
  FlaskConical,
  Settings,
  Activity,
  FileWarning,
  Globe,
  Webhook,
  Key,
} from 'lucide-react';
import { cn } from '../ui/cn';

// Define nav items outside component to prevent recreation on each render
const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/traffic', label: 'Traffic', icon: Activity },
  { path: '/defense', label: 'Defense', icon: Shield },
  { path: '/deception', label: 'Deception', icon: FileWarning },
  { path: '/chaos', label: 'Chaos', icon: Zap },
  { path: '/cluster', label: 'Cluster', icon: Globe },
  { path: '/webhooks', label: 'Webhooks', icon: Webhook },
  { path: '/mtd', label: 'MTD', icon: Key },
  { path: '/testing', label: 'Testing Lab', icon: FlaskConical },
  { path: '/network', label: 'Network', icon: Network },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;

export function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-neutral-950 border-r border-neutral-800 flex flex-col relative overflow-hidden">
      {/* Tech Decoration */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 via-transparent to-transparent opacity-50" />
      
      {/* Logo/Brand */}
      <div className="h-16 flex items-center px-6 border-b border-neutral-800/50 bg-neutral-900/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-primary-500/10 border border-primary-500 flex items-center justify-center">
            <span className="text-primary-400 font-bold font-mono">A</span>
          </div>
          <span className="text-lg font-bold text-neutral-100 tracking-tight font-mono uppercase">Apparatus</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6" aria-label="Main navigation">
        <div className="px-4 mb-2 text-xs font-mono text-neutral-500 uppercase tracking-widest pl-4">
          Modules
        </div>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <NavLink
                to={path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-2.5 text-sm font-medium font-mono tracking-tight relative group',
                    'transition-all duration-200 border-l-2',
                    'focus-visible:outline-none focus-visible:bg-neutral-800',
                    isActive
                      ? 'bg-neutral-900/50 text-primary-400 border-primary-500 shadow-[inset_10px_0_20px_-10px_rgba(0,240,255,0.1)]'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/30 hover:border-neutral-700'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-primary-500 drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]" : "text-neutral-500 group-hover:text-neutral-300"
                    )} />
                    <span>{label}</span>
                    
                    {/* Active Indicator (Dot) */}
                    <span className={cn(
                      "absolute right-4 w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_5px_rgba(0,240,255,1)] transition-transform duration-300",
                      isActive ? "scale-100 opacity-100" : "scale-0 opacity-0"
                    )} />
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer / System Status */}
      <div className="p-4 border-t border-neutral-800 bg-neutral-900/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono text-neutral-500 uppercase">System Status</span>
          <span className="text-[10px] font-mono text-success-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
            ONLINE
          </span>
        </div>
        <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full bg-success-500 w-[98%] shadow-[0_0_10px_rgba(0,255,148,0.5)]" />
        </div>
        <div className="mt-3 flex justify-between text-[10px] font-mono text-neutral-600">
          <span>v1.0.0</span>
          <span>Build 8942</span>
        </div>
      </div>
    </aside>
  );
}

Sidebar.displayName = 'Sidebar';
