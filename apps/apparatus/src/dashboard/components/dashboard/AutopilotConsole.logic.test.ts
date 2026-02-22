import { describe, expect, it } from 'vitest';
import type { SessionContext } from '../../hooks/useAutopilot';
import {
  compactAssetLabel,
  deriveAutopilotMemoryPanelModel,
  formatSeenAt,
} from './AutopilotConsole.logic';

function makeSessionContext(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    assets: [],
    observations: [],
    relations: [],
    objectiveProgress: {
      preconditionsMet: [],
      openedPaths: [],
      breakSignals: [],
      lastUpdatedAt: '2026-02-22T00:00:00.000Z',
    },
    ...overrides,
  };
}

describe('AutopilotConsole.logic', () => {
  it('derives empty model safely when session context is missing', () => {
    const model = deriveAutopilotMemoryPanelModel(undefined);
    expect(model.acquiredAssets).toEqual([]);
    expect(model.relationStrip).toEqual([]);
    expect(model.breakSignals).toEqual([]);
    expect(model.openedPaths).toEqual([]);
    expect(model.preconditions).toEqual([]);
  });

  it('derives sorted and bounded memory model for populated context', () => {
    const model = deriveAutopilotMemoryPanelModel(
      makeSessionContext({
        assets: Array.from({ length: 18 }).map((_, index) => ({
          id: `asset-${index}`,
          type: 'endpoint',
          value: `/path-${index}`,
          source: 'verification',
          confidence: 0.8,
          firstSeenAt: `2026-02-22T00:00:${String(index).padStart(2, '0')}.000Z`,
          lastSeenAt: `2026-02-22T00:00:${String(index).padStart(2, '0')}.000Z`,
          occurrences: 1,
        })),
        relations: Array.from({ length: 19 }).map((_, index) => ({
          id: `rel-${index}`,
          type: 'targets',
          fromAssetId: `asset:endpoint:/path-${index}`,
          toAssetId: `asset:vuln:new-5xx-errors:${index}`,
          source: 'verification',
          confidence: 0.9,
          firstSeenAt: `2026-02-22T00:01:${String(index).padStart(2, '0')}.000Z`,
          lastSeenAt: `2026-02-22T00:01:${String(index).padStart(2, '0')}.000Z`,
          occurrences: 1,
        })),
        objectiveProgress: {
          preconditionsMet: ['no-break-detected'],
          openedPaths: ['/checkout'],
          breakSignals: ['new-5xx-errors:4'],
          lastUpdatedAt: '2026-02-22T00:01:59.000Z',
        },
      })
    );

    expect(model.acquiredAssets).toHaveLength(14);
    expect(model.acquiredAssets[0]?.id).toBe('asset-17');
    expect(model.relationStrip).toHaveLength(16);
    expect(model.relationStrip[0]?.id).toBe('rel-18');
    expect(model.breakSignals).toEqual(['new-5xx-errors:4']);
    expect(model.openedPaths).toEqual(['/checkout']);
    expect(model.preconditions).toEqual(['no-break-detected']);
  });

  it('formats timestamps and compacts long labels', () => {
    expect(formatSeenAt(undefined)).toBe('n/a');
    expect(formatSeenAt('not-a-date')).toBe('n/a');
    expect(formatSeenAt('2026-02-22T00:00:00.000Z')).not.toBe('n/a');

    const long = `asset:endpoint:${'x'.repeat(100)}`;
    expect(compactAssetLabel(long).length).toBeLessThanOrEqual(52);
    expect(compactAssetLabel('asset:endpoint:/checkout')).toBe('endpoint:/checkout');
  });
});
