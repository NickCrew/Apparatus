/**
 * Action Handler for TUI Dashboard
 *
 * Executes API mutations with loading states, error handling,
 * and result notifications.
 */

import type { ApiClient } from '../api-client.js';
import type { Store } from './store.js';
import type { ModalManager } from './modal.js';

/**
 * Action result type
 */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Action definition
 */
export interface ActionDefinition<TParams = unknown, TResult = unknown> {
  name: string;
  execute: (params: TParams, context: ActionContext) => Promise<TResult>;
  onSuccess?: (result: TResult, context: ActionContext) => void;
  onError?: (error: Error, context: ActionContext) => void;
  showLoading?: boolean;
  loadingMessage?: string;
  confirmMessage?: string;
  dangerConfirm?: boolean;
}

/**
 * Context passed to action handlers
 */
export interface ActionContext {
  client: ApiClient;
  store: Store;
  modal: ModalManager;
  refreshData: () => Promise<void>;
}

/**
 * Action Handler manages API mutations
 */
export class ActionHandler {
  private client: ApiClient;
  private store: Store;
  private modal: ModalManager;
  private actions: Map<string, ActionDefinition> = new Map();
  private refreshCallback: (() => Promise<void>) | null = null;

  constructor(client: ApiClient, store: Store, modal: ModalManager) {
    this.client = client;
    this.store = store;
    this.modal = modal;
  }

  /**
   * Set the refresh callback
   */
  setRefreshCallback(callback: () => Promise<void>): void {
    this.refreshCallback = callback;
  }

  /**
   * Register an action
   */
  register<TParams = unknown, TResult = unknown>(
    action: ActionDefinition<TParams, TResult>
  ): void {
    this.actions.set(action.name, action as ActionDefinition);
  }

  /**
   * Register multiple actions
   */
  registerAll(actions: ActionDefinition[]): void {
    for (const action of actions) {
      this.register(action);
    }
  }

  /**
   * Execute an action by name
   */
  async execute<TParams = unknown, TResult = unknown>(
    name: string,
    params?: TParams
  ): Promise<ActionResult<TResult>> {
    const action = this.actions.get(name) as ActionDefinition<TParams, TResult> | undefined;
    if (!action) {
      return { success: false, error: `Unknown action: ${name}` };
    }

    const context: ActionContext = {
      client: this.client,
      store: this.store,
      modal: this.modal,
      refreshData: async () => {
        if (this.refreshCallback) {
          await this.refreshCallback();
        }
      },
    };

    // Show confirmation if required
    if (action.confirmMessage) {
      return new Promise((resolve) => {
        this.modal.showConfirm(
          {
            title: action.dangerConfirm ? 'Warning' : 'Confirm',
            message: action.confirmMessage!,
            danger: action.dangerConfirm,
          },
          async () => {
            const result = await this.executeAction(action, params, context);
            resolve(result);
          },
          () => {
            resolve({ success: false, error: 'Cancelled by user' });
          }
        );
      });
    }

    return this.executeAction(action, params, context);
  }

  /**
   * Execute action with loading state
   */
  private async executeAction<TParams, TResult>(
    action: ActionDefinition<TParams, TResult>,
    params: TParams | undefined,
    context: ActionContext
  ): Promise<ActionResult<TResult>> {
    // Show loading if configured
    if (action.showLoading) {
      this.modal.showLoading(action.loadingMessage ?? `Executing ${action.name}...`);
    }

    try {
      const result = await action.execute(params as TParams, context);

      // Close loading
      if (action.showLoading) {
        this.modal.close();
      }

      // Call success handler
      if (action.onSuccess) {
        action.onSuccess(result, context);
      }

      return { success: true, data: result };
    } catch (error) {
      // Close loading
      if (action.showLoading) {
        this.modal.close();
      }

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Call error handler or show default error
      if (action.onError) {
        action.onError(error as Error, context);
      } else {
        this.modal.showResult({
          title: 'Error',
          content: `Failed to execute ${action.name}:\n\n${errorMessage}`,
          type: 'error',
        });
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get all registered action names
   */
  getActionNames(): string[] {
    return Array.from(this.actions.keys());
  }
}

/**
 * Create common tarpit actions
 */
export function createTarpitActions(): ActionDefinition[] {
  return [
    {
      name: 'tarpit:release',
      execute: async (params: unknown, ctx: ActionContext) => {
        const { ip } = params as { ip: string };
        return ctx.client.releaseTarpitIp(ip);
      },
      onSuccess: async (_result: unknown, ctx: ActionContext) => {
        await ctx.refreshData();
        ctx.modal.showResult({
          title: 'Success',
          content: 'IP released from tarpit',
          type: 'success',
        });
      },
      showLoading: true,
      loadingMessage: 'Releasing IP...',
    },
    {
      name: 'tarpit:releaseAll',
      execute: async (_params: unknown, ctx: ActionContext) => {
        return ctx.client.releaseAllTarpit();
      },
      onSuccess: async (result: unknown, ctx: ActionContext) => {
        const { count } = result as { count: number };
        await ctx.refreshData();
        ctx.modal.showResult({
          title: 'Success',
          content: `Released ${count} IPs from tarpit`,
          type: 'success',
        });
      },
      showLoading: true,
      loadingMessage: 'Releasing all IPs...',
      confirmMessage: 'Release all IPs from tarpit?',
      dangerConfirm: true,
    },
  ];
}

/**
 * Create data refresh actions
 */
export function createRefreshActions(): ActionDefinition[] {
  return [
    {
      name: 'refresh:health',
      execute: async (_, ctx) => {
        const health = await ctx.client.getHealth();
        ctx.store.set('health', health);
        ctx.store.set('lastUpdated', new Date());
        return health;
      },
    },
    {
      name: 'refresh:tarpit',
      execute: async (_, ctx) => {
        const tarpit = await ctx.client.getTarpitStatus();
        ctx.store.set('tarpit', tarpit);
        return tarpit;
      },
    },
    {
      name: 'refresh:deception',
      execute: async (_, ctx) => {
        const deception = await ctx.client.getDeceptionHistory();
        ctx.store.set('deception', deception);
        return deception;
      },
    },
    {
      name: 'refresh:all',
      execute: async (_, ctx) => {
        const results = await Promise.allSettled([
          ctx.client.getHealth(),
          ctx.client.getTarpitStatus(),
          ctx.client.getDeceptionHistory(),
        ]);

        if (results[0].status === 'fulfilled') {
          ctx.store.set('health', results[0].value);
        }
        if (results[1].status === 'fulfilled') {
          ctx.store.set('tarpit', results[1].value);
        }
        if (results[2].status === 'fulfilled') {
          ctx.store.set('deception', results[2].value);
        }

        ctx.store.set('lastUpdated', new Date());
        ctx.store.clearError();

        return { refreshed: true };
      },
    },
  ];
}

/**
 * Create defense configuration actions
 */
export function createDefenseActions(): ActionDefinition[] {
  return [
    {
      name: 'sentinel:add',
      execute: async (params: unknown, ctx) => {
        const p = params as { pattern: string; action: 'block' | 'log' };
        return ctx.client.addSentinelRule(p.pattern, p.action);
      },
      onSuccess: async (result, ctx) => {
        const r = result as any;
        await ctx.refreshData();
        ctx.modal.showResult({
          title: 'Success',
          content: `Rule added successfully!\n\nID: ${r.id}\nPattern: ${r.pattern}`,
          type: 'success',
        });
      },
      showLoading: true,
      loadingMessage: 'Adding rule...',
    },
    {
      name: 'sentinel:delete',
      execute: async (params: unknown, ctx) => {
        const p = params as { id: string };
        return ctx.client.deleteSentinelRule(p.id);
      },
      onSuccess: async (_, ctx) => {
        await ctx.refreshData();
        ctx.modal.showResult({
          title: 'Success',
          content: 'Rule deleted successfully!',
          type: 'success',
        });
      },
      showLoading: true,
      loadingMessage: 'Deleting rule...',
      confirmMessage: 'Are you sure you want to delete this rule?',
      dangerConfirm: true,
    },
    {
      name: 'mtd:rotate',
      execute: async (params: unknown, ctx) => {
        const p = params as { prefix?: string };
        return ctx.client.rotateMtdPrefix(p.prefix);
      },
      onSuccess: async (result, ctx) => {
        const r = result as any;
        await ctx.refreshData();
        ctx.modal.showResult({
          title: 'Success',
          content: `MTD prefix rotated!\n\nNew prefix: ${r.currentPrefix}`,
          type: 'success',
        });
      },
      showLoading: true,
      loadingMessage: 'Rotating MTD prefix...',
    },
    {
      name: 'dlp:generate',
      execute: async (params: unknown, ctx) => {
        const p = params as { type: 'cc' | 'ssn' | 'email' | 'sql' };
        return ctx.client.generateDlpData(p.type);
      },
      showLoading: true,
      loadingMessage: 'Generating test data...',
    },
  ];
}

/**
 * Create an action handler with common actions registered
 */
export function createActionHandler(
  client: ApiClient,
  store: Store,
  modal: ModalManager
): ActionHandler {
  const handler = new ActionHandler(client, store, modal);

  // Register common actions
  handler.registerAll(createTarpitActions());
  handler.registerAll(createRefreshActions());
  handler.registerAll(createDefenseActions());

  return handler;
}
