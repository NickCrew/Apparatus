/**
 * Apparatus Theme for Terminal UI
 * Color definitions and style configurations
 */

export const THEME = {
  // Brand colors (terminal approximations)
  colors: {
    primary: 'blue',       // Primary Blue #0057B7
    accent: 'cyan',        // Accent highlights
    success: 'green',      // Connected, healthy, OK
    warning: 'yellow',     // Degraded, caution
    error: 'red',          // Error, blocked, critical
    muted: 'gray',         // Secondary text, borders
    text: 'white',         // Primary text
  },

  // Status colors
  status: {
    healthy: 'green',
    degraded: 'yellow',
    critical: 'red',
    connected: 'green',
    disconnected: 'red',
  },

  // Severity colors for threat signals
  severity: {
    low: 'gray',
    medium: 'cyan',
    high: 'yellow',
    critical: 'red',
  },

  // HTTP status code colors
  httpStatus: {
    '2xx': 'green',
    '3xx': 'cyan',
    '4xx': 'yellow',
    '5xx': 'red',
  },

  // Border styles for different panels
  borders: {
    header: 'cyan',
    health: 'green',
    deception: 'magenta',
    requests: 'gray',
    modal: 'cyan',
  },

  // Sparkline characters (low to high)
  sparkChars: ['_', '-', '–', '=', '≡', '≣', '#', '█'],
};

// Re-export colors for direct import convenience
export const colors = THEME.colors;

/**
 * Get color for HTTP status code
 */
export function getStatusColor(status: number): string {
  if (status >= 500) return THEME.httpStatus['5xx'];
  if (status >= 400) return THEME.httpStatus['4xx'];
  if (status >= 300) return THEME.httpStatus['3xx'];
  return THEME.httpStatus['2xx'];
}

/**
 * Get color for severity level
 */
export function getSeverityColor(severity: string): string {
  return THEME.severity[severity as keyof typeof THEME.severity] || THEME.colors.text;
}

/**
 * Get color for health status
 */
export function getHealthColor(status: string): string {
  return THEME.status[status as keyof typeof THEME.status] || THEME.colors.text;
}

/**
 * Format relative time (e.g., "30s ago", "2m ago")
 */
export function formatRelativeTime(timestamp: number | string | null): string {
  if (!timestamp) return 'never';

  const ts = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const delta = Date.now() - ts;

  if (delta < 1000) return '<1s ago';

  const seconds = Math.floor(delta / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Create a sparkline from numeric values
 */
export function createSparkline(values: number[], width: number = 20): string {
  if (values.length === 0) return ''.padEnd(width, ' ');

  const slice = values.slice(-width);
  const min = Math.min(...slice);
  const max = Math.max(...slice);

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return ''.padEnd(width, ' ');
  }

  if (max === min) {
    const char = max <= 0 ? THEME.sparkChars[0] : THEME.sparkChars[THEME.sparkChars.length - 2];
    return char.repeat(slice.length).padEnd(width, ' ');
  }

  const range = max - min;
  const chars = slice.map((value) => {
    const normalized = (value - min) / range;
    const index = Math.min(
      THEME.sparkChars.length - 1,
      Math.max(0, Math.round(normalized * (THEME.sparkChars.length - 1)))
    );
    return THEME.sparkChars[index];
  });

  return chars.join('').padStart(width, ' ');
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

/**
 * Pad string to fixed width
 */
export function padFixed(str: string, width: number, align: 'left' | 'right' = 'left'): string {
  const truncated = truncate(str, width);
  return align === 'left' ? truncated.padEnd(width) : truncated.padStart(width);
}
