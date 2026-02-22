import { describe, expect, it } from 'vitest';
import {
  SESSION_CONTEXT_LIMITS,
  addObjectiveProgressSignal,
  createSession,
  getSession,
  resetRedTeamStoreForTests,
  upsertSessionAsset,
  upsertSessionObservation,
  upsertSessionRelation,
} from '../src/ai/report-store.js';

describe('RedTeam SessionContext Memory', () => {
  it('initializes new sessions with empty typed context', () => {
    resetRedTeamStoreForTests();
    const session = createSession({
      objective: 'Find break on /checkout',
      targetBaseUrl: 'http://127.0.0.1:8090',
      maxIterations: 5,
      allowedTools: ['cluster.attack', 'delay'],
    });

    expect(session.sessionContext.assets).toEqual([]);
    expect(session.sessionContext.observations).toEqual([]);
    expect(session.sessionContext.relations).toEqual([]);
    expect(session.sessionContext.objectiveProgress.preconditionsMet).toEqual([]);
    expect(session.sessionContext.objectiveProgress.openedPaths).toEqual([]);
    expect(session.sessionContext.objectiveProgress.breakSignals).toEqual([]);
  });

  it('dedupes assets and relations deterministically', () => {
    resetRedTeamStoreForTests();
    const session = createSession({
      objective: 'Find break on /checkout',
      targetBaseUrl: 'http://127.0.0.1:8090',
      maxIterations: 5,
      allowedTools: ['cluster.attack', 'delay'],
    });

    const firstAsset = upsertSessionAsset(session.id, {
      type: 'endpoint',
      value: '/Checkout',
      source: 'nuclei.run',
      confidence: 0.4,
    });
    const secondAsset = upsertSessionAsset(session.id, {
      type: 'endpoint',
      value: ' /checkout ',
      source: 'fuzzer',
      confidence: 0.8,
    });

    expect(firstAsset?.id).toBe(secondAsset?.id);
    expect(getSession(session.id)?.sessionContext.assets).toHaveLength(1);
    expect(secondAsset?.occurrences).toBe(2);
    expect(secondAsset?.confidence).toBe(0.8);
    expect(secondAsset?.source).toBe('fuzzer');

    const firstRelation = upsertSessionRelation(session.id, {
      type: 'confirms',
      fromAssetId: firstAsset?.id || '',
      toAssetId: 'asset:vuln:weak auth',
      source: 'verification',
      confidence: 0.3,
    });
    const secondRelation = upsertSessionRelation(session.id, {
      type: 'confirms',
      fromAssetId: '  ASSET:ENDPOINT:/CHECKOUT ',
      toAssetId: 'asset:vuln:weak auth',
      source: 'verification',
      confidence: 0.9,
    });

    expect(firstRelation?.id).toBe(secondRelation?.id);
    expect(getSession(session.id)?.sessionContext.relations).toHaveLength(1);
    expect(secondRelation?.occurrences).toBe(2);
    expect(secondRelation?.confidence).toBe(0.9);
  });

  it('bounds observations and objective progress signals', () => {
    resetRedTeamStoreForTests();
    const session = createSession({
      objective: 'Find break on /checkout',
      targetBaseUrl: 'http://127.0.0.1:8090',
      maxIterations: 5,
      allowedTools: ['cluster.attack', 'delay'],
    });

    for (let i = 0; i < SESSION_CONTEXT_LIMITS.observations + 3; i++) {
      upsertSessionObservation(session.id, {
        kind: 'tool-output',
        source: 'cluster.attack',
        summary: `observation-${i}`,
      });
    }

    upsertSessionObservation(session.id, {
      kind: 'tool-output',
      source: 'cluster.attack',
      summary: 'observation-final',
    });
    upsertSessionObservation(session.id, {
      kind: 'tool-output',
      source: 'cluster.attack',
      summary: 'observation-final',
    });

    const updatedSession = getSession(session.id);
    expect(updatedSession?.sessionContext.observations).toHaveLength(SESSION_CONTEXT_LIMITS.observations);
    expect(updatedSession?.sessionContext.observations[0]?.summary).toBe('observation-4');
    const dedupedObservation = updatedSession?.sessionContext.observations.find(
      (entry) => entry.summary === 'observation-final'
    );
    expect(dedupedObservation?.occurrences).toBe(2);

    for (let i = 0; i < SESSION_CONTEXT_LIMITS.objectiveSignals + 2; i++) {
      addObjectiveProgressSignal(session.id, 'openedPaths', `/path-${i}`);
    }
    addObjectiveProgressSignal(session.id, 'openedPaths', '/path-10');

    const progress = getSession(session.id)?.sessionContext.objectiveProgress;
    expect(progress?.openedPaths).toHaveLength(SESSION_CONTEXT_LIMITS.objectiveSignals);
    expect(progress?.openedPaths[0]).toBe('/path-2');
  });
});
