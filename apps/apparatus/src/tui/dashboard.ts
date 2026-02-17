/**
 * Apparatus TUI Dashboard
 * Security-focused terminal dashboard for Apparatus
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { SSEClient } from './sse-client.js';
import { ApiClient, ApiPoller } from './api-client.js';
import {
  THEME,
  formatRelativeTime,
  getStatusColor,
  getSeverityColor,
  getHealthColor,
  truncate,
} from './theme.js';
import type {
  DashboardState,
  RequestEntry,
  TarpitEntry,
  DeceptionEvent,
  LogFilter,
  SSEEvent,
} from './types.js';

export interface DashboardOptions {
  target: string;
  refreshInterval?: number;
  maxRequests?: number;
}

export function createDashboard(options: DashboardOptions) {
  const { target, refreshInterval = 5000, maxRequests = 100 } = options;
  // Initialize state
  const state: DashboardState = {
    connected: false,
    requests: [],
  };

  const logFilter: LogFilter = {};

  // Create screen
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Apparatus TUI - Apparatus Dashboard',
  });

  // Create grid layout (12x12)
  const grid = new (contrib as any).grid({ rows: 12, cols: 12, screen });

  // ========================================
  // Header (Row 0-1)
  // ========================================
  const header = grid.set(0, 0, 1, 12, (contrib as any).markdown, {
    label: ' Apparatus TUI ',
    tags: true,
    padding: { left: 1, right: 1 },
    style: { border: { fg: THEME.borders.header } },
  });

  function updateHeader() {
    const sseStatus = state.connected
      ? `{green-fg}● SSE{/green-fg}`
      : `{red-fg}○ SSE{/red-fg}`;
    const healthStatus = state.health
      ? `{${getHealthColor(state.health.status)}-fg}${state.health.status}{/${getHealthColor(state.health.status)}-fg} (${(state.health.lag_ms ?? 0).toFixed(0)}ms)`
      : '{gray-fg}unknown{/gray-fg}';

    header.setMarkdown(
      `**Target:** ${target} | ${sseStatus} | **Health:** ${healthStatus} | ` +
      `**q**:quit **?**:help **f**:filter **x**:release **R**:reconnect`
    );
  }

  // ========================================
  // Health Status (Row 1-3)
  // ========================================
  const healthBox = grid.set(1, 0, 2, 6, blessed.box, {
    label: ' Health ',
    border: { type: 'line' },
    style: { border: { fg: THEME.borders.health } },
    tags: true,
    padding: { left: 1, right: 1 },
  });

  function updateHealthBox() {
    if (!state.health) {
      healthBox.setContent('{gray-fg}Loading...{/gray-fg}');
      return;
    }

    const h = state.health;
    const statusColor = getHealthColor(h.status);
    const lines = [
      `Status: {${statusColor}-fg}${h.status.toUpperCase()}{/${statusColor}-fg}`,
      `Lag: ${(h.lag_ms ?? 0).toFixed(1)}ms`,
      state.lastUpdated ? `Updated: ${formatRelativeTime(state.lastUpdated)}` : '',
    ];
    healthBox.setContent(lines.filter(Boolean).join('\n'));
  }

  // ========================================
  // Totals (Row 1-3)
  // ========================================
  const totalsBox = grid.set(1, 6, 2, 6, blessed.box, {
    label: ' Totals ',
    border: { type: 'line' },
    style: { border: { fg: THEME.colors.muted } },
    tags: true,
    padding: { left: 1, right: 1 },
  });

  function updateTotalsBox() {
    const reqCount = state.requests.length;
    const tarpitCount = state.tarpit?.count ?? 0;
    const deceptionCount = state.deception?.count ?? 0;
    const lines = [
      `Requests: ${reqCount}`,
      `Tarpit: ${tarpitCount} IPs`,
      `Deception: ${deceptionCount}`,
    ];
    totalsBox.setContent(lines.join('\n'));
  }

  // ========================================
  // Deception Panel (Row 3-5)
  // ========================================
  const deceptionBox = grid.set(3, 0, 2, 6, blessed.box, {
    label: ' Deception Activity ',
    border: { type: 'line' },
    style: { border: { fg: THEME.borders.deception } },
    tags: true,
    padding: { left: 1, right: 1 },
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    vi: true,
  });

  function updateDeceptionBox() {
    if (!state.deception || state.deception.events.length === 0) {
      deceptionBox.setContent('{gray-fg}No deception events{/gray-fg}');
      return;
    }

    const lines = state.deception.events.slice(0, 8).map((e: DeceptionEvent) => {
      const time = new Date(e.timestamp).toLocaleTimeString();
      const typeColor = e.type === 'honeypot_hit' ? 'magenta' : e.type === 'shell_command' ? 'red' : 'yellow';
      return `{${typeColor}-fg}${e.type}{/${typeColor}-fg} ${e.ip} ${truncate(e.route, 20)} ${time}`;
    });

    deceptionBox.setContent(lines.join('\n'));
  }

  // ========================================
  // Tarpit Panel (Row 3-5)
  // ========================================
  const tarpitBox = grid.set(3, 6, 2, 6, blessed.box, {
    label: ' Tarpit (x:release X:all) ',
    border: { type: 'line' },
    style: { border: { fg: 'red' } },
    tags: true,
    padding: { left: 1, right: 1 },
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    vi: true,
  });

  let selectedTarpitIndex = 0;

  function updateTarpitBox() {
    if (!state.tarpit || state.tarpit.trapped.length === 0) {
      tarpitBox.setContent('{gray-fg}No trapped IPs{/gray-fg}\nTraps: ' +
        (state.tarpit?.trapPaths?.join(', ') || '/wp-admin, /.env, /.git'));
      return;
    }

    const lines = state.tarpit.trapped.slice(0, 8).map((t: TarpitEntry, idx: number) => {
      const duration = Math.floor((Date.now() - t.trappedAt) / 1000);
      const durationStr = duration > 60 ? `${Math.floor(duration / 60)}m${duration % 60}s` : `${duration}s`;
      const pointer = idx === selectedTarpitIndex ? '{yellow-fg}>{/yellow-fg}' : ' ';
      return `${pointer}{red-fg}${t.ip}{/red-fg} trapped ${durationStr}`;
    });

    lines.push('');
    lines.push(`{gray-fg}Traps: ${state.tarpit.trapPaths.slice(0, 3).join(', ')}{/gray-fg}`);

    tarpitBox.setContent(lines.join('\n'));
  }

  // ========================================
  // Recent Signals Panel (Row 5-7)
  // ========================================
  const signalsBox = grid.set(5, 0, 2, 6, blessed.box, {
    label: ' Recent Threat Signals ',
    border: { type: 'line' },
    style: { border: { fg: 'yellow' } },
    tags: true,
    padding: { left: 1, right: 1 },
    scrollable: true,
  });

  function updateSignalsBox() {
    signalsBox.setContent('{gray-fg}No recent signals{/gray-fg}');
  }

  // ========================================
  // System Info Panel (Row 5-7)
  // ========================================
  const infoBox = grid.set(5, 6, 2, 6, blessed.box, {
    label: ' Connection Info ',
    border: { type: 'line' },
    style: { border: { fg: THEME.colors.muted } },
    tags: true,
    padding: { left: 1, right: 1 },
  });

  function updateInfoBox() {
    const lines = [
      `Target: ${truncate(target, 30)}`,
      state.error ? `{red-fg}Error: ${truncate(state.error, 25)}{/red-fg}` : '',
    ];
    infoBox.setContent(lines.filter(Boolean).join('\n'));
  }

  // ========================================
  // Request Log Table (Row 7-11)
  // ========================================
  const requestTable = grid.set(7, 0, 5, 12, (contrib as any).table, {
    label: ' Live Requests (↑/↓ navigate, Enter details, f filter) ',
    columnWidth: [10, 7, 40, 6, 18],
    columnSpacing: 2,
    keys: true,
    interactive: true,
    fg: 'white',
    style: {
      header: { fg: 'white', bold: true },
      cell: { fg: 'white' },
      border: { fg: THEME.borders.requests },
    },
  });

  function applyFilter(req: RequestEntry): boolean {
    if (logFilter.method && req.method !== logFilter.method) return false;
    if (logFilter.pathContains && !req.path.includes(logFilter.pathContains)) return false;
    if (logFilter.ipContains && !req.ip.includes(logFilter.ipContains)) return false;
    return true;
  }

  function updateRequestTable() {
    const filtered = state.requests.filter(applyFilter);
    const rows = filtered.slice(0, 50).map((r: RequestEntry) => {
      const time = new Date(r.timestamp).toLocaleTimeString();
      const statusColor = r.latencyMs !== undefined ? getStatusColor(200) : THEME.colors.muted;
      return [
        time,
        r.method,
        truncate(r.path, 38),
        r.latencyMs?.toString() ?? '-',
        r.ip,
      ];
    });

    (requestTable as any).setData({
      headers: ['Time', 'Method', 'Path', 'ms', 'IP'],
      data: rows.length > 0 ? rows : [['', '', 'No requests yet', '', '']],
    });
  }

  // ========================================
  // Help Modal
  // ========================================
  function showHelp() {
    const helpBox = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: '70%',
      height: '70%',
      border: 'line',
      label: ' Help — Press Esc to close ',
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      tags: true,
      style: { border: { fg: THEME.borders.modal } },
      padding: { left: 2, right: 2, top: 1, bottom: 1 },
      content:
        '{bold}Apparatus TUI Dashboard{/bold}\n\n' +
        '{underline}Keyboard Shortcuts{/underline}\n' +
        '  q, Ctrl+C    Quit dashboard\n' +
        '  ?, h         Show this help\n' +
        '  f            Open filter dialog\n' +
        '  c            Clear all filters\n' +
        '  x            Release selected tarpit IP\n' +
        '  X            Release all tarpit IPs\n' +
        '  R            Reconnect SSE\n' +
        '  r            Force refresh all data\n' +
        '  ↑/↓, j/k     Navigate lists\n' +
        '  Enter        Show request details\n' +
        '  Tab          Switch focus between panels\n\n' +
        '{underline}Panels{/underline}\n' +
        '  Health       System status and event loop lag\n' +
        '  Deception    Honeypot activity log\n' +
        '  Tarpit       Currently trapped IPs\n' +
        '  Signals      Recent threat signals sent\n' +
        '  Requests     Live request stream\n\n' +
        '{underline}SSE Events{/underline}\n' +
        '  request      New HTTP request received\n' +
        '  deception    Honeypot activity detected\n' +
        '  tarpit       IP trapped or released\n' +
        '  health       System health update\n',
    });

    helpBox.key(['escape', 'q', 'enter'], () => {
      helpBox.destroy();
      screen.render();
    });

    helpBox.focus();
    screen.render();
  }

  // ========================================
  // Filter Modal
  // ========================================
  function showFilterDialog() {
    const filterBox = blessed.form({
      parent: screen,
      top: 'center',
      left: 'center',
      width: '50%',
      height: '50%',
      border: 'line',
      label: ' Filter Requests ',
      keys: true,
      style: { border: { fg: THEME.borders.modal } },
    });

    blessed.text({
      parent: filterBox,
      top: 1,
      left: 2,
      content: 'Method (GET, POST, etc.):',
    });

    const methodInput = blessed.textbox({
      parent: filterBox,
      top: 2,
      left: 2,
      width: 20,
      height: 3,
      border: 'line',
      value: logFilter.method || '',
    });

    blessed.text({
      parent: filterBox,
      top: 5,
      left: 2,
      content: 'Path contains:',
    });

    const pathInput = blessed.textbox({
      parent: filterBox,
      top: 6,
      left: 2,
      width: 30,
      height: 3,
      border: 'line',
      value: logFilter.pathContains || '',
    });

    blessed.text({
      parent: filterBox,
      top: 9,
      left: 2,
      content: 'IP contains:',
    });

    const ipInput = blessed.textbox({
      parent: filterBox,
      top: 10,
      left: 2,
      width: 20,
      height: 3,
      border: 'line',
      value: logFilter.ipContains || '',
    });

    const applyBtn = blessed.button({
      parent: filterBox,
      top: 14,
      left: 2,
      width: 12,
      height: 3,
      border: 'line',
      content: 'Apply',
      align: 'center',
    });

    const cancelBtn = blessed.button({
      parent: filterBox,
      top: 14,
      left: 16,
      width: 12,
      height: 3,
      border: 'line',
      content: 'Cancel',
      align: 'center',
    });

    function apply() {
      const method = methodInput.getValue() as string;
      const path = pathInput.getValue() as string;
      const ip = ipInput.getValue() as string;

      logFilter.method = method || undefined;
      logFilter.pathContains = path || undefined;
      logFilter.ipContains = ip || undefined;

      filterBox.destroy();
      updateRequestTable();
      screen.render();
    }

    applyBtn.on('press', apply);
    cancelBtn.on('press', () => {
      filterBox.destroy();
      screen.render();
    });

    filterBox.key(['escape'], () => {
      filterBox.destroy();
      screen.render();
    });
    filterBox.key(['enter'], apply);

    methodInput.focus();
    screen.render();
  }

  // ========================================
  // Request Details Modal
  // ========================================
  function showRequestDetails() {
    const selectedIndex = (requestTable as any).rows?.selected ?? 0;
    const filtered = state.requests.filter(applyFilter);
    const req = filtered[selectedIndex];

    if (!req) return;

    const detailBox = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: '80%',
      height: '80%',
      border: 'line',
      label: ' Request Details — Esc to close ',
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      tags: true,
      style: { border: { fg: THEME.borders.modal } },
      padding: { left: 2, right: 2, top: 1, bottom: 1 },
      content:
        `{bold}Request Details{/bold}\n\n` +
        `Method: ${req.method}\n` +
        `Path: ${req.path}\n` +
        `Full URL: ${req.originalUrl}\n` +
        `HTTP Version: ${req.httpVersion}\n` +
        `IP: ${req.ip}\n` +
        `Timestamp: ${req.timestamp}\n` +
        `Latency: ${req.latencyMs ?? 'N/A'}ms\n\n` +
        `{underline}Query Parameters{/underline}\n` +
        JSON.stringify(req.query, null, 2) + '\n\n' +
        `{underline}Headers{/underline}\n` +
        Object.entries(req.headers).map(([k, v]) => `  ${k}: ${v}`).join('\n') + '\n\n' +
        (req.body ? `{underline}Body{/underline}\n${JSON.stringify(req.body, null, 2)}` : ''),
    });

    detailBox.key(['escape', 'q', 'enter'], () => {
      detailBox.destroy();
      screen.render();
    });

    detailBox.focus();
    screen.render();
  }

  // ========================================
  // AI Chat Modal (Placeholder)
  // ========================================
  function showAIChatModal() {
    const modal = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: '60%',
      height: '50%',
      border: 'line',
      label: ' AI Chat — Esc to close ',
      tags: true,
      style: { border: { fg: THEME.borders.modal } },
      padding: { left: 2, right: 2, top: 1, bottom: 1 },
      content: '{bold}AI Chat{/bold}\n\nAI Chat modal coming soon.\n\nPress Esc to close.',
    });

    modal.key(['escape', 'q'], () => {
      modal.destroy();
      screen.render();
    });

    modal.focus();
    screen.render();
  }

  // ========================================
  // Escape Scan Modal (Placeholder)
  // ========================================
  function showEscapeModal() {
    const modal = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: '60%',
      height: '50%',
      border: 'line',
      label: ' Escape Artist — Esc to close ',
      tags: true,
      style: { border: { fg: THEME.borders.modal } },
      padding: { left: 2, right: 2, top: 1, bottom: 1 },
      content: '{bold}Escape Artist (Egress Tester){/bold}\n\nEgress scan modal coming soon.\n\nPress Esc to close.',
    });

    modal.key(['escape', 'q'], () => {
      modal.destroy();
      screen.render();
    });

    modal.focus();
    screen.render();
  }

  // ========================================
  // Update all panels
  // ========================================
  function render() {
    updateHeader();
    updateHealthBox();
    updateTotalsBox();
    updateDeceptionBox();
    updateTarpitBox();
    updateSignalsBox();
    updateInfoBox();
    updateRequestTable();
    screen.render();
  }

  // ========================================
  // Initialize API client and poller
  // ========================================
  const apiClient = new ApiClient({ baseUrl: target });
  const poller = new ApiPoller(apiClient);

  // Start polling
  poller.start('health', () => apiClient.getHealth(), 5000,
    (data) => { state.health = data; state.lastUpdated = Date.now(); render(); },
    (err) => { state.error = err.message; render(); }
  );

  poller.start('tarpit', () => apiClient.getTarpitStatus(), 10000,
    (data) => { state.tarpit = data; render(); },
    (err) => { /* Ignore tarpit errors */ }
  );

  poller.start('deception', () => apiClient.getDeceptionHistory(), 10000,
    (data) => { state.deception = data; render(); },
    (err) => { /* Ignore deception errors */ }
  );

  // ========================================
  // Initialize SSE client
  // ========================================
  const sseClient = new SSEClient({ baseUrl: target });

  sseClient.on('connected', () => {
    state.connected = true;
    state.error = undefined;
    render();
  });

  sseClient.on('disconnected', () => {
    state.connected = false;
    render();
  });

  sseClient.on('request', (event: SSEEvent<RequestEntry>) => {
    state.requests.unshift(event.data);
    if (state.requests.length > maxRequests) {
      state.requests.pop();
    }
    render();
  });

  sseClient.on('deception', (event: SSEEvent<DeceptionEvent>) => {
    if (!state.deception) {
      state.deception = { count: 0, events: [] };
    }
    state.deception.events.unshift(event.data);
    state.deception.count++;
    if (state.deception.events.length > 50) {
      state.deception.events.pop();
    }
    render();
  });

  sseClient.on('tarpit', (event: SSEEvent<{ action: string; ip: string }>) => {
    // Trigger a refresh of tarpit data
    apiClient.getTarpitStatus().then(data => {
      state.tarpit = data;
      render();
    }).catch(() => {});
  });

  sseClient.on('health', (event: SSEEvent<{ status: string; lag_ms: number }>) => {
    state.health = event.data as any;
    state.lastUpdated = Date.now();
    render();
  });

  sseClient.on('reconnecting', ({ attempt, delay }: { attempt: number; delay: number }) => {
    state.error = `Reconnecting... (${attempt})`;
    render();
  });

  sseClient.on('max_reconnect_reached', () => {
    state.error = 'Max reconnect attempts reached. Press R to retry.';
    render();
  });

  // Connect SSE
  sseClient.connect();

  // ========================================
  // Keyboard bindings
  // ========================================
  screen.key(['q', 'C-c'], () => {
    sseClient.disconnect();
    poller.stopAll();
    screen.destroy();
    process.exit(0);
  });

  screen.key(['?', 'h'], showHelp);
  screen.key(['f'], showFilterDialog);
  screen.key(['c'], () => {
    logFilter.method = undefined;
    logFilter.pathContains = undefined;
    logFilter.ipContains = undefined;
    updateRequestTable();
    screen.render();
  });

  screen.key(['R'], () => {
    state.error = 'Reconnecting...';
    render();
    sseClient.reconnect();
  });

  screen.key(['r'], async () => {
    state.error = 'Refreshing...';
    render();
    try {
      const [health, tarpit, deception] = await Promise.all([
        apiClient.getHealth(),
        apiClient.getTarpitStatus().catch(() => undefined),
        apiClient.getDeceptionHistory().catch(() => undefined),
      ]);
      state.health = health;
      if (tarpit) state.tarpit = tarpit;
      if (deception) state.deception = deception;
      state.lastUpdated = Date.now();
      state.error = undefined;
    } catch (err) {
      state.error = err instanceof Error ? err.message : 'Refresh failed';
    }
    render();
  });

  screen.key(['x'], async () => {
    if (!state.tarpit?.trapped.length) return;
    const ip = state.tarpit.trapped[selectedTarpitIndex]?.ip;
    if (!ip) return;

    try {
      await apiClient.releaseTarpitIp(ip);
      // Refresh tarpit data
      const tarpit = await apiClient.getTarpitStatus();
      state.tarpit = tarpit;
      if (selectedTarpitIndex >= tarpit.trapped.length) {
        selectedTarpitIndex = Math.max(0, tarpit.trapped.length - 1);
      }
      render();
    } catch (err) {
      state.error = `Failed to release ${ip}`;
      render();
    }
  });

  screen.key(['X'], async () => {
    try {
      await apiClient.releaseAllTarpit();
      const tarpit = await apiClient.getTarpitStatus();
      state.tarpit = tarpit;
      selectedTarpitIndex = 0;
      render();
    } catch (err) {
      state.error = 'Failed to release all IPs';
      render();
    }
  });

  screen.key(['j', 'down'], () => {
    if (state.tarpit && selectedTarpitIndex < state.tarpit.trapped.length - 1) {
      selectedTarpitIndex++;
      updateTarpitBox();
      screen.render();
    }
  });

  screen.key(['k', 'up'], () => {
    if (selectedTarpitIndex > 0) {
      selectedTarpitIndex--;
      updateTarpitBox();
      screen.render();
    }
  });

  requestTable.key(['enter'], showRequestDetails);

  screen.key(['a'], showAIChatModal);
  screen.key(['e'], showEscapeModal);

  // Initial render
  render();

  return {
    screen,
    sseClient,
    poller,
    state,
  };
}
