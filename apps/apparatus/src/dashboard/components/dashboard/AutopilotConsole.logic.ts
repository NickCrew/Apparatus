import type { SessionContext, SessionContextAsset, SessionContextRelation } from '../../hooks/useAutopilot';

const ACQUIRED_ASSETS_LIMIT = 14;
const RELATION_STRIP_LIMIT = 16;

function timestampOrZero(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface AutopilotMemoryPanelModel {
  acquiredAssets: SessionContextAsset[];
  relationStrip: SessionContextRelation[];
  breakSignals: string[];
  openedPaths: string[];
  preconditions: string[];
}

export function deriveAutopilotMemoryPanelModel(
  sessionContext?: SessionContext | null
): AutopilotMemoryPanelModel {
  const assets = sessionContext?.assets || [];
  const relations = sessionContext?.relations || [];
  const objectiveProgress = sessionContext?.objectiveProgress;

  return {
    acquiredAssets: [...assets]
      .sort((left, right) => timestampOrZero(right.lastSeenAt) - timestampOrZero(left.lastSeenAt))
      .slice(0, ACQUIRED_ASSETS_LIMIT),
    relationStrip: [...relations]
      .sort((left, right) => timestampOrZero(right.lastSeenAt) - timestampOrZero(left.lastSeenAt))
      .slice(0, RELATION_STRIP_LIMIT),
    breakSignals: objectiveProgress?.breakSignals || [],
    openedPaths: objectiveProgress?.openedPaths || [],
    preconditions: objectiveProgress?.preconditionsMet || [],
  };
}

export function formatSeenAt(value?: string) {
  if (!value) return 'n/a';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'n/a';
  return new Date(timestamp).toLocaleTimeString();
}

export function compactAssetLabel(value: string) {
  const cleaned = value.replace(/^asset:/, '');
  if (cleaned.length <= 52) return cleaned;
  return `${cleaned.slice(0, 49)}...`;
}
