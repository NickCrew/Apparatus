import { describe, expect, it } from 'vitest';
import {
  calculateBootProgress,
  getMaxBootDurationMs,
  getMinimumBootDurationMs,
  getTimeoutNoticeDelayMs,
  progressBarWidth,
  quantizeProgress,
  shouldShowBootGate,
} from './terminalBootGateLogic';

const LINES = [
  'Mounting gRPC listeners... OK',
  'Syncing deception profiles... OK',
  'Connecting to cluster nodes... OK',
];

describe('terminalBootGateLogic', () => {
  describe('shouldShowBootGate', () => {
    it('shows boot until minimum duration has elapsed', () => {
      expect(
        shouldShowBootGate({
          hasExitedBoot: false,
          dismissed: false,
          minimumBootElapsed: false,
          providerReady: true,
          maxWaitElapsed: false,
          timeoutNoticeElapsed: false,
        }),
      ).toBe(true);
    });

    it('hides when minimum elapsed and provider is ready', () => {
      expect(
        shouldShowBootGate({
          hasExitedBoot: false,
          dismissed: false,
          minimumBootElapsed: true,
          providerReady: true,
          maxWaitElapsed: false,
          timeoutNoticeElapsed: false,
        }),
      ).toBe(false);
    });

    it('keeps showing while waiting for timeout notice grace', () => {
      expect(
        shouldShowBootGate({
          hasExitedBoot: false,
          dismissed: false,
          minimumBootElapsed: true,
          providerReady: false,
          maxWaitElapsed: true,
          timeoutNoticeElapsed: false,
        }),
      ).toBe(true);
    });

    it('hides when timeout grace is exhausted', () => {
      expect(
        shouldShowBootGate({
          hasExitedBoot: false,
          dismissed: false,
          minimumBootElapsed: true,
          providerReady: false,
          maxWaitElapsed: true,
          timeoutNoticeElapsed: true,
        }),
      ).toBe(false);
    });

    it('always hides when dismissed', () => {
      expect(
        shouldShowBootGate({
          hasExitedBoot: false,
          dismissed: true,
          minimumBootElapsed: false,
          providerReady: false,
          maxWaitElapsed: false,
          timeoutNoticeElapsed: false,
        }),
      ).toBe(false);
    });

    it('never re-shows after boot has exited', () => {
      expect(
        shouldShowBootGate({
          hasExitedBoot: true,
          dismissed: false,
          minimumBootElapsed: true,
          providerReady: false,
          maxWaitElapsed: false,
          timeoutNoticeElapsed: false,
        }),
      ).toBe(false);
    });
  });

  describe('timing helpers', () => {
    it('returns expected minimum durations by motion + session state', () => {
      expect(getMinimumBootDurationMs(true, true)).toBe(0);
      expect(getMinimumBootDurationMs(true, false)).toBe(450);
      expect(getMinimumBootDurationMs(false, true)).toBe(250);
      expect(getMinimumBootDurationMs(false, false)).toBe(1500);
    });

    it('returns expected max boot durations', () => {
      expect(getMaxBootDurationMs(true)).toBe(1600);
      expect(getMaxBootDurationMs(false)).toBe(6500);
    });

    it('returns expected timeout notice delays', () => {
      expect(getTimeoutNoticeDelayMs(true)).toBe(300);
      expect(getTimeoutNoticeDelayMs(false)).toBe(2200);
    });
  });

  describe('progress helpers', () => {
    it('calculates progress from typed characters and lines', () => {
      expect(calculateBootProgress(0, 0, LINES)).toBe(0);
      expect(calculateBootProgress(1, 0, LINES)).toBe(33);
      expect(calculateBootProgress(2, 5, LINES)).toBeGreaterThan(66);
      expect(calculateBootProgress(3, 0, LINES)).toBe(100);
    });

    it('quantizes progress to 25% increments', () => {
      expect(quantizeProgress(0)).toBe(0);
      expect(quantizeProgress(24)).toBe(0);
      expect(quantizeProgress(25)).toBe(25);
      expect(quantizeProgress(74)).toBe(50);
      expect(quantizeProgress(99)).toBe(75);
      expect(quantizeProgress(100)).toBe(100);
    });

    it('enforces progress bar minimum width', () => {
      expect(progressBarWidth(0)).toBe('8%');
      expect(progressBarWidth(4)).toBe('8%');
      expect(progressBarWidth(50)).toBe('50%');
      expect(progressBarWidth(100)).toBe('100%');
    });
  });
});
