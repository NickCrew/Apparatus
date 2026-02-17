/**
 * Defense Configuration Screen
 * Combines Active Shield, MTD, and DLP widgets
 */

import blessed from 'blessed';
import type { Store } from '../core/store.js';
import type { ActionHandler } from '../core/action-handler.js';
import type { ModalManager } from '../core/modal.js';
import type { ApiClient } from '../api-client.js';
import { SentinelWidget } from '../widgets/sentinel-widget.js';
import { MtdWidget } from '../widgets/mtd-widget.js';
import { DlpWidget } from '../widgets/dlp-widget.js';
import { showAddRuleModal } from '../modals/add-rule-modal.js';
import { showDlpOutputModal } from '../modals/dlp-output-modal.js';
import type { DlpData, MtdStatus, SentinelRule } from '../types.js';

export interface DefenseScreenOptions {
  screen: blessed.Widgets.Screen;
  store: Store;
  actionHandler: ActionHandler;
  modal: ModalManager;
  client: ApiClient;
}

export class DefenseScreen {
  private screen: blessed.Widgets.Screen;
  private store: Store;
  private actionHandler: ActionHandler;
  private modal: ModalManager;
  private client: ApiClient;
  private container: blessed.Widgets.BoxElement;
  private sentinelWidget: SentinelWidget;
  private mtdWidget: MtdWidget;
  private dlpWidget: DlpWidget;
  private mounted = false;

  constructor(options: DefenseScreenOptions) {
    this.screen = options.screen;
    this.store = options.store;
    this.actionHandler = options.actionHandler;
    this.modal = options.modal;
    this.client = options.client;

    // Create container
    this.container = blessed.box({
      parent: this.screen,
      top: 2,
      left: 0,
      width: '100%',
      height: '100%-3',
    });

    // Create grid layout: 2 rows, 2 columns
    // Row 1: Active Shield (left), MTD (right)
    // Row 2: DLP Generator (full width)

    this.sentinelWidget = new SentinelWidget('sentinel', {
      row: 0,
      col: 0,
      rowSpan: 1,
      colSpan: 1,
      label: 'Active Shield',
    });

    this.mtdWidget = new MtdWidget('mtd', {
      row: 0,
      col: 1,
      rowSpan: 1,
      colSpan: 1,
      label: 'MTD Configuration',
    });

    this.dlpWidget = new DlpWidget('dlp', {
      row: 1,
      col: 0,
      rowSpan: 1,
      colSpan: 2,
      label: 'DLP Test Generator',
    });

    this.setupWidgets();
  }

  private setupWidgets(): void {
    // Position widgets in grid
    const screenWidth = this.screen.width as number;
    const screenHeight = (this.screen.height as number) - 3;

    const colWidth = Math.floor(screenWidth / 2);
    const row1Height = Math.floor(screenHeight * 0.6);
    const row2Height = screenHeight - row1Height;

    // Active Shield (top-left)
    this.sentinelWidget.element.top = 0;
    this.sentinelWidget.element.left = 0;
    this.sentinelWidget.element.width = colWidth;
    this.sentinelWidget.element.height = row1Height;
    this.container.append(this.sentinelWidget.element);

    // MTD (top-right)
    this.mtdWidget.element.top = 0;
    this.mtdWidget.element.left = colWidth;
    this.mtdWidget.element.width = colWidth;
    this.mtdWidget.element.height = row1Height;
    this.container.append(this.mtdWidget.element);

    // DLP (bottom, full width)
    this.dlpWidget.element.top = row1Height;
    this.dlpWidget.element.left = 0;
    this.dlpWidget.element.width = screenWidth;
    this.dlpWidget.element.height = row2Height;
    this.container.append(this.dlpWidget.element);

    // Set up callbacks
    this.sentinelWidget.onAddRule(() => this.handleAddRule());
    this.sentinelWidget.onDeleteRule((ruleId) => this.handleDeleteRule(ruleId));

    this.mtdWidget.onRotate((prefix) => this.handleRotateMtd(prefix));

    this.dlpWidget.onGenerate((type) => this.handleGenerateDlp(type));
    this.dlpWidget.onShowOutput((data) => this.handleShowDlpOutput(data));
  }

  private async handleAddRule(): Promise<void> {
    showAddRuleModal(this.screen, this.modal, async (pattern, action) => {
      try {
        this.modal.showLoading('Adding rule...');
        const rule = await this.client.addSentinelRule(pattern, action);
        this.modal.close();

        this.modal.showResult({
          title: 'Success',
          content: `Rule added successfully!\n\nID: ${rule.id}\nPattern: ${rule.pattern}\nAction: ${action}`,
          type: 'success',
        });

        // Refresh rules
        await this.refreshSentinelRules();
      } catch (error) {
        this.modal.close();
        this.modal.showResult({
          title: 'Error',
          content: `Failed to add rule:\n\n${error instanceof Error ? error.message : String(error)}`,
          type: 'error',
        });
      }
    });
  }

  private async handleDeleteRule(ruleId: string): Promise<void> {
    this.modal.showConfirm(
      {
        title: 'Delete Rule',
        message: `Are you sure you want to delete rule ${ruleId}?`,
        danger: true,
      },
      async () => {
        try {
          this.modal.showLoading('Deleting rule...');
          await this.client.deleteSentinelRule(ruleId);
          this.modal.close();

          this.modal.showResult({
            title: 'Success',
            content: 'Rule deleted successfully!',
            type: 'success',
          });

          // Refresh rules
          await this.refreshSentinelRules();
        } catch (error) {
          this.modal.close();
          this.modal.showResult({
            title: 'Error',
            content: `Failed to delete rule:\n\n${error instanceof Error ? error.message : String(error)}`,
            type: 'error',
          });
        }
      }
    );
  }

  private async handleRotateMtd(prefix?: string): Promise<void> {
    try {
      this.modal.showLoading('Rotating MTD prefix...');
      const status = await this.client.rotateMtdPrefix(prefix);
      this.modal.close();

      const newPrefix = status.currentPrefix;
      this.modal.showResult({
        title: 'Success',
        content: `MTD prefix rotated!\n\nNew prefix: ${newPrefix}\n\nAll requests must now use:\n/${newPrefix}/...`,
        type: 'success',
      });

      // Update widget
      this.mtdWidget.setStatus({
        enabled: true,
        currentPrefix: newPrefix,
        rotationCount: 0,
        lastRotatedAt: new Date().toISOString(),
      });
    } catch (error) {
      this.modal.close();
      this.modal.showResult({
        title: 'Error',
        content: `Failed to rotate MTD prefix:\n\n${error instanceof Error ? error.message : String(error)}`,
        type: 'error',
      });
    }
  }

  private async handleGenerateDlp(type: 'cc' | 'ssn' | 'email' | 'sql'): Promise<void> {
    try {
      this.modal.showLoading(`Generating ${type.toUpperCase()} data...`);
      const data = await this.client.generateDlpData(type);
      this.modal.close();

      this.dlpWidget.setGeneratedData(data);

      // Show notification
      if (!this.screen) return;
      const notification = blessed.box({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: 50,
        height: 5,
        border: { type: 'line' },
        style: {
          border: { fg: 'green' },
          fg: 'white',
          bg: 'black',
        },
        tags: true,
        content: `\n  {green-fg}✓{/green-fg} ${type.toUpperCase()} data generated!\n  {gray-fg}Press Enter to view details{/gray-fg}`,
      });

      setTimeout(() => {
        this.screen?.remove(notification);
        this.screen?.render();
      }, 2000);

      this.screen.render();
    } catch (error) {
      this.modal.close();
      this.modal.showResult({
        title: 'Error',
        content: `Failed to generate DLP data:\n\n${error instanceof Error ? error.message : String(error)}`,
        type: 'error',
      });
    }
  }

  private handleShowDlpOutput(data: DlpData): void {
    showDlpOutputModal(this.screen, this.modal, data);
  }

  private async refreshSentinelRules(): Promise<void> {
    try {
      const rules = await this.client.getSentinelRules();
      // Map backend format to expected format
      const mappedRules: SentinelRule[] = rules.map((r: any) => ({
        id: r.id,
        pattern: r.pattern,
        action: r.action,
        createdAt: new Date().toISOString(),
        matchCount: 0,
        enabled: true,
      }));
      this.sentinelWidget.setRules(mappedRules);
    } catch (error) {
      console.error('Failed to refresh sentinel rules:', error);
    }
  }

  private async refreshMtdStatus(): Promise<void> {
    try {
      const status = await this.client.getMtdStatus();
      this.mtdWidget.setStatus({
        enabled: !!status.currentPrefix,
        currentPrefix: status.currentPrefix,
        rotationCount: 0,
        lastRotatedAt: null,
      });
    } catch (error) {
      console.error('Failed to refresh MTD status:', error);
    }
  }

  async mount(): Promise<void> {
    if (this.mounted) return;

    // Mount widgets
    this.sentinelWidget.mount(this.screen, this.store);
    this.mtdWidget.mount(this.screen, this.store);
    this.dlpWidget.mount(this.screen, this.store);

    // Load initial data
    await Promise.all([
      this.refreshSentinelRules(),
      this.refreshMtdStatus(),
    ]);

    // Focus first widget
    this.sentinelWidget.element.focus();

    this.mounted = true;
    this.screen.render();
  }

  unmount(): void {
    if (!this.mounted) return;

    this.sentinelWidget.destroy();
    this.mtdWidget.destroy();
    this.dlpWidget.destroy();

    this.screen.remove(this.container);
    this.mounted = false;
    this.screen.render();
  }

  focus(): void {
    if (this.mounted) {
      this.sentinelWidget.element.focus();
    }
  }
}
