import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useApparatus } from '../../providers/ApparatusProvider';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import {
  calculateBootProgress,
  getMaxBootDurationMs,
  getMinimumBootDurationMs,
  getTimeoutNoticeDelayMs,
  progressBarWidth,
  quantizeProgress,
  shouldShowBootGate,
} from './terminalBootGateLogic';

const BOOT_LOG_LINES = [
  'Mounting gRPC listeners... OK',
  'Syncing deception profiles... OK',
  'Connecting to cluster nodes... OK',
  'Calibrating threat telemetry... OK',
  'Hydrating tactical dashboard... OK',
];
const BOOT_SEEN_SESSION_KEY = 'apparatus-terminal-boot-seen';

export function TerminalBootGate({ children }: { children: ReactNode }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { health, hasCompletedInitialHealthCheck } = useApparatus();
  const [hasSeenBoot, setHasSeenBoot] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(BOOT_SEEN_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [minimumBootElapsed, setMinimumBootElapsed] = useState(false);
  const [maxWaitElapsed, setMaxWaitElapsed] = useState(false);
  const [timeoutNoticeElapsed, setTimeoutNoticeElapsed] = useState(false);
  const [hasExitedBoot, setHasExitedBoot] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousShouldShowBoot = useRef<boolean | null>(null);
  const skipButtonRef = useRef<HTMLButtonElement>(null);

  const minimumBootDuration = getMinimumBootDurationMs(prefersReducedMotion, hasSeenBoot);
  const maxBootDuration = getMaxBootDurationMs(prefersReducedMotion);
  const providerReady = hasCompletedInitialHealthCheck;

  useEffect(() => {
    if (minimumBootElapsed) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMinimumBootElapsed(true);
    }, minimumBootDuration);

    return () => window.clearTimeout(timeoutId);
  }, [minimumBootDuration, minimumBootElapsed]);

  useEffect(() => {
    if (maxWaitElapsed) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMaxWaitElapsed(true);
    }, maxBootDuration);

    return () => window.clearTimeout(timeoutId);
  }, [maxBootDuration, maxWaitElapsed]);

  useEffect(() => {
    if (!maxWaitElapsed || providerReady) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTimeoutNoticeElapsed(true);
    }, getTimeoutNoticeDelayMs(prefersReducedMotion));

    return () => window.clearTimeout(timeoutId);
  }, [maxWaitElapsed, providerReady, prefersReducedMotion]);

  useEffect(() => {
    if (lineIndex >= BOOT_LOG_LINES.length) {
      return;
    }

    const activeLine = BOOT_LOG_LINES[lineIndex];

    if (typedChars < activeLine.length) {
      const characterDelay = prefersReducedMotion ? 4 : 18;
      const timeoutId = window.setTimeout(() => {
        setTypedChars((prev) => prev + 1);
      }, characterDelay);

      return () => window.clearTimeout(timeoutId);
    }

    const linePause = prefersReducedMotion ? 24 : 160;
    const timeoutId = window.setTimeout(() => {
      setLineIndex((prev) => prev + 1);
      setTypedChars(0);
    }, linePause);

    return () => window.clearTimeout(timeoutId);
  }, [lineIndex, typedChars, prefersReducedMotion]);

  useEffect(() => {
    if (hasExitedBoot) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDismissed(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasExitedBoot]);

  const shouldShowBoot = shouldShowBootGate({
    hasExitedBoot,
    dismissed,
    minimumBootElapsed,
    providerReady,
    maxWaitElapsed,
    timeoutNoticeElapsed,
  });

  useEffect(() => {
    if (shouldShowBoot) {
      skipButtonRef.current?.focus();
    }
  }, [shouldShowBoot]);

  const bootStatus = health.status === 'healthy' ? 'ONLINE' : health.status.toUpperCase();

  const progress = useMemo(
    () => calculateBootProgress(lineIndex, typedChars, BOOT_LOG_LINES),
    [lineIndex, typedChars],
  );
  const announcedProgress = useMemo(() => quantizeProgress(progress), [progress]);

  const visibleLines = BOOT_LOG_LINES.slice(0, Math.min(lineIndex, BOOT_LOG_LINES.length));
  const activeLine = BOOT_LOG_LINES[lineIndex]?.slice(0, typedChars) ?? '';

  useEffect(() => {
    if (previousShouldShowBoot.current === null) {
      previousShouldShowBoot.current = shouldShowBoot;
      return;
    }

    if (!shouldShowBoot) {
      try {
        sessionStorage.setItem(BOOT_SEEN_SESSION_KEY, '1');
      } catch {
        // sessionStorage unavailable
      }
      setHasSeenBoot(true);
      setHasExitedBoot(true);
    }

    if (previousShouldShowBoot.current && !shouldShowBoot) {
      contentRef.current?.focus();
    }

    previousShouldShowBoot.current = shouldShowBoot;
  }, [shouldShowBoot]);

  if (shouldShowBoot) {
    return (
      <section
        className="crt-shell relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 px-6 text-neutral-100 animate-fade-in"
        aria-label="Application loading sequence"
      >
        <div aria-hidden className="crt-chromatic-layer" />

        <div className="relative z-10 w-full max-w-3xl rounded-sm border border-primary/25 bg-black/65 px-5 py-5 shadow-panel backdrop-blur-sm md:px-7 md:py-6">
          <div className="flex items-start justify-between gap-4">
            <p className="text-[0.62rem] uppercase tracking-[0.28em] text-primary/80 font-mono terminal-flicker">
              Cybersecurity Lab Initialization Sequence
            </p>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Skip boot sequence (Escape)"
              ref={skipButtonRef}
              className="rounded-sm border border-white/20 px-2 py-1 text-[0.58rem] font-mono uppercase tracking-[0.14em] text-neutral-300 transition-colors hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              Skip Boot
            </button>
          </div>

          <div className="mt-4 space-y-1 rounded-sm border border-white/5 bg-black/40 p-4 font-mono text-[0.76rem] leading-relaxed text-neutral-300 md:text-[0.8rem]">
            {visibleLines.map((line) => (
              <p key={line}>
                <span className="text-primary/80">[ok]</span> {line}
              </p>
            ))}
            {lineIndex < BOOT_LOG_LINES.length ? (
              <p className="text-neutral-200">
                <span className="text-primary/80">[~]</span> {activeLine}
                <span className="terminal-caret" aria-hidden>
                  _
                </span>
              </p>
            ) : !providerReady ? (
              <p className="text-neutral-400">
                <span className="text-warning">[wait]</span> Awaiting telemetry heartbeat...
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-3 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-neutral-500">
            <span>
              Status:{' '}
              <span className="terminal-flicker text-primary">{bootStatus}</span>
            </span>
            <span>Boot {progress}%</span>
          </div>

          <div className="mt-2 h-1.5 rounded-full bg-neutral-900">
            <div
              className="h-full rounded-full bg-primary/80 shadow-[0_0_10px_rgba(0,196,167,0.45)] transition-[width] duration-200 ease-out"
              style={{ width: progressBarWidth(progress) }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Boot progress"
            />
          </div>

          <p className="sr-only" aria-live="polite" aria-atomic="true">
            Loading application: {announcedProgress}% complete.
          </p>

          {maxWaitElapsed && !providerReady && (
            <p className="mt-3 text-[0.65rem] font-mono text-warning" aria-live="polite">
              Server connection pending. Dashboard will reconnect automatically.
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <div
      className={prefersReducedMotion ? '' : 'animate-fade-in'}
      ref={contentRef}
      tabIndex={-1}
    >
      {children}
      {!providerReady && (
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Server connection pending. Dashboard will reconnect automatically.
        </p>
      )}
    </div>
  );
}
