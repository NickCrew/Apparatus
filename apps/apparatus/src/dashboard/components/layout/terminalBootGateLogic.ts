export interface BootGateVisibilityState {
  hasExitedBoot: boolean;
  dismissed: boolean;
  minimumBootElapsed: boolean;
  providerReady: boolean;
  maxWaitElapsed: boolean;
  timeoutNoticeElapsed: boolean;
}

const FULL_MOTION_MIN_BOOT_FRESH_MS = 1500;
const FULL_MOTION_MIN_BOOT_SEEN_MS = 250;
const REDUCED_MOTION_MIN_BOOT_FRESH_MS = 450;
const REDUCED_MOTION_MIN_BOOT_SEEN_MS = 0;

const FULL_MOTION_MAX_BOOT_MS = 6500;
const REDUCED_MOTION_MAX_BOOT_MS = 1600;

const FULL_MOTION_TIMEOUT_NOTICE_DELAY_MS = 2200;
const REDUCED_MOTION_TIMEOUT_NOTICE_DELAY_MS = 300;

export function getMinimumBootDurationMs(prefersReducedMotion: boolean, hasSeenBoot: boolean): number {
  if (prefersReducedMotion) {
    return hasSeenBoot ? REDUCED_MOTION_MIN_BOOT_SEEN_MS : REDUCED_MOTION_MIN_BOOT_FRESH_MS;
  }

  return hasSeenBoot ? FULL_MOTION_MIN_BOOT_SEEN_MS : FULL_MOTION_MIN_BOOT_FRESH_MS;
}

export function getMaxBootDurationMs(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? REDUCED_MOTION_MAX_BOOT_MS : FULL_MOTION_MAX_BOOT_MS;
}

export function getTimeoutNoticeDelayMs(prefersReducedMotion: boolean): number {
  return prefersReducedMotion
    ? REDUCED_MOTION_TIMEOUT_NOTICE_DELAY_MS
    : FULL_MOTION_TIMEOUT_NOTICE_DELAY_MS;
}

export function shouldShowBootGate(state: BootGateVisibilityState): boolean {
  if (state.hasExitedBoot) {
    return false;
  }

  if (state.dismissed) {
    return false;
  }

  if (!state.minimumBootElapsed) {
    return true;
  }

  if (state.providerReady) {
    return false;
  }

  return !state.maxWaitElapsed || !state.timeoutNoticeElapsed;
}

export function calculateBootProgress(
  lineIndex: number,
  typedChars: number,
  lines: readonly string[],
): number {
  if (lines.length === 0) {
    return 100;
  }

  const clampedIndex = Math.max(0, Math.min(lineIndex, lines.length));
  const completed = Math.min(clampedIndex, lines.length);
  const activeLineLength = lines[clampedIndex]?.length ?? 0;
  const partial = activeLineLength > 0 ? Math.max(0, typedChars) / activeLineLength : 0;
  const total = Math.min(lines.length, completed + partial);

  return Math.round((total / lines.length) * 100);
}

export function quantizeProgress(progress: number): number {
  const clamped = Math.max(0, Math.min(progress, 100));
  return Math.floor(clamped / 25) * 25;
}

export function progressBarWidth(progress: number): string {
  const clamped = Math.max(0, Math.min(progress, 100));
  return `${Math.max(8, clamped)}%`;
}
