// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TerminalBootGate } from './TerminalBootGate';

let mockReady = false;
let mockHealthStatus: 'healthy' | 'unhealthy' | 'degraded' | 'critical' | 'checking' | 'unknown' = 'healthy';
let mockReducedMotion = false;

vi.mock('../../providers/ApparatusProvider', () => ({
  useApparatus: () => ({
    health: { status: mockHealthStatus },
    hasCompletedInitialHealthCheck: mockReady,
  }),
}));

vi.mock('../../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => mockReducedMotion,
}));

describe('TerminalBootGate component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockReady = false;
    mockReducedMotion = false;
    mockHealthStatus = 'healthy';
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  function renderGate() {
    return render(
      <TerminalBootGate>
        <div data-testid="dashboard">Dashboard Content</div>
      </TerminalBootGate>,
    );
  }

  it('renders boot dialog initially with skip affordance', () => {
    renderGate();

    expect(screen.getByText(/cybersecurity lab initialization sequence/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /skip boot sequence/i })).toBeTruthy();
  });

  it('dismisses immediately on skip button click', () => {
    renderGate();

    fireEvent.click(screen.getByRole('button', { name: /skip boot sequence/i }));

    expect(screen.getByTestId('dashboard')).toBeTruthy();
    expect(screen.queryByText(/cybersecurity lab initialization sequence/i)).toBeNull();
  });

  it('dismisses on Escape key', () => {
    renderGate();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.getByTestId('dashboard')).toBeTruthy();
  });

  it('moves focus to skip button while boot gate is visible', () => {
    renderGate();

    const skipButton = screen.getByRole('button', { name: /skip boot sequence/i });
    expect(document.activeElement).toBe(skipButton);
  });

  it('moves focus to content wrapper when boot exits', () => {
    mockReady = true;
    renderGate();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    const content = screen.getByTestId('dashboard').parentElement;
    expect(content).toBeTruthy();
    expect(document.activeElement).toBe(content);
  });

  it('shows timeout warning before auto-dismiss and then reveals dashboard', () => {
    renderGate();

    act(() => {
      vi.advanceTimersByTime(1500 + 6500);
    });

    expect(screen.getByText(/server connection pending/i)).toBeTruthy();
    expect(screen.getByText(/cybersecurity lab initialization sequence/i)).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(2200);
    });

    expect(screen.getByTestId('dashboard')).toBeTruthy();
    expect(screen.queryByText(/cybersecurity lab initialization sequence/i)).toBeNull();
  });

  it('does not re-show boot gate after initial exit when readiness flips later', () => {
    mockReady = true;
    const view = renderGate();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByTestId('dashboard')).toBeTruthy();

    mockReady = false;
    view.rerender(
      <TerminalBootGate>
        <div data-testid="dashboard">Dashboard Content</div>
      </TerminalBootGate>,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByTestId('dashboard')).toBeTruthy();
    expect(screen.queryByText(/cybersecurity lab initialization sequence/i)).toBeNull();
  });
});
