import { cn } from './cn';

type Status = 'connected' | 'connecting' | 'disconnected' | 'error';
type StatusSize = 'sm' | 'md' | 'lg';

interface StatusIndicatorProps {
  status: Status;
  size?: StatusSize;
  showLabel?: boolean;
  className?: string;
}

const STATUS_COLORS: Record<Status, string> = {
  connected: 'bg-success-500',
  connecting: 'bg-warning-500',
  disconnected: 'bg-neutral-500',
  error: 'bg-danger-500',
};

const STATUS_LABELS: Record<Status, string> = {
  connected: 'Connected',
  connecting: 'Connecting',
  disconnected: 'Disconnected',
  error: 'Error',
};

const SIZE_STYLES: Record<StatusSize, string> = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

export function StatusIndicator({
  status,
  size = 'md',
  showLabel = false,
  className,
}: StatusIndicatorProps) {
  const isPulsing = status === 'connected' || status === 'connecting';

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className="relative flex">
        {isPulsing && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
              STATUS_COLORS[status]
            )}
            aria-hidden="true"
          />
        )}
        <span
          className={cn(
            'relative inline-flex rounded-full',
            SIZE_STYLES[size],
            STATUS_COLORS[status]
          )}
          role="img"
          aria-label={STATUS_LABELS[status]}
        />
      </span>
      {showLabel && (
        <span className="text-sm text-neutral-400">{STATUS_LABELS[status]}</span>
      )}
    </div>
  );
}

StatusIndicator.displayName = 'StatusIndicator';
