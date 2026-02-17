import { Card, CardContent } from './Card';
import { cn } from './cn';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number; // percentage
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: React.ElementType;
  className?: string;
  chart?: React.ReactNode; // Slot for a mini sparkline
}

export function StatCard({ label, value, trend, icon: Icon, className, chart }: StatCardProps) {
  const isPositive = trend?.direction === 'up';
  const isNeutral = trend?.direction === 'neutral';
  
  // For "Command Center", positive isn't always green (e.g. high load).
  // But generally Up = Green for metrics like "Uptime", "Traffic".
  // Let's assume standard coloring for now.
  
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest block">
              {label}
            </span>
            <div className="text-2xl font-bold font-mono text-neutral-100 tracking-tight">
              {value}
            </div>
          </div>
          
          {Icon && (
            <div className="p-2 bg-neutral-800/50 rounded-sm text-primary-400">
              <Icon size={18} />
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          {trend ? (
            <div className={cn(
              "flex items-center text-xs font-mono",
              isPositive ? "text-success-400" : isNeutral ? "text-neutral-400" : "text-danger-400"
            )}>
              {isPositive ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          ) : (
            <div className="text-xs font-mono text-neutral-600">NO DATA</div>
          )}
          
          {chart && <div className="h-8 w-24">{chart}</div>}
        </div>
        
        {/* Background Decoration */}
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-primary-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
      </CardContent>
    </Card>
  );
}
