import { Activity, Shield, Zap, Globe, Cpu } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { StatCard } from '../ui/StatCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { TrafficVisualizer } from './TrafficVisualizer';
import { useApparatus } from '../../providers/ApparatusProvider';

const MOCK_LOGS = [
  { id: 1, time: '10:42:05', level: 'WARN', module: 'WAF', message: 'Rate limit exceeded for IP 192.168.1.42' },
  { id: 2, time: '10:41:58', level: 'INFO', module: 'AUTH', message: 'New session established: user-admin' },
  { id: 3, time: '10:41:12', level: 'ERR', module: 'CHAOS', message: 'Latency injection failed: payment-gateway' },
  { id: 4, time: '10:40:30', level: 'INFO', module: 'NET', message: 'Inbound traffic spike on port 443' },
  { id: 5, time: '10:39:44', level: 'INFO', module: 'TLS', message: 'Certificate rotation completed' },
];

export function Overview() {
  const { health } = useApparatus();

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-end justify-between opacity-0 animate-terminal-in stagger-1">
        <div>
          <h1 className="text-display-lg font-display text-neutral-100 uppercase">
            System Overview
          </h1>
          <p className="text-sm font-sans text-neutral-600 mt-0.5">
            Real-time telemetry and control status
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Export</Button>
          <Button variant="neon" size="sm" leftIcon={<Zap className="h-3 w-3" />}>
            Engage Defense
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 opacity-0 animate-terminal-in stagger-2">
        <StatCard
          label="Total Traffic"
          value="2.4 GB/s"
          trend={{ value: 12, direction: 'up' }}
          icon={Activity}
          accent="primary"
        />
        <StatCard
          label="Active Threats"
          value="42"
          trend={{ value: 5, direction: 'down' }}
          icon={Shield}
          accent="danger"
        />
        <StatCard
          label="System Load"
          value="78%"
          trend={{ value: 2, direction: 'up' }}
          icon={Cpu}
          accent="warning"
        />
        <StatCard
          label="Uptime"
          value={health.status === 'healthy' ? '99.99%' : '—'}
          trend={{ value: 0, direction: 'neutral' }}
          icon={Globe}
          accent="success"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left: Traffic + Modules (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Traffic Visualizer */}
          <div className="opacity-0 animate-terminal-in stagger-3">
            <TrafficVisualizer />
          </div>

          {/* Module Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-0 animate-terminal-in stagger-5">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="h-3.5 w-3.5 text-primary-500/70" />
                  Active Defenses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ModuleRow label="WAF Ruleset" status="Active" variant="success" />
                <ModuleRow label="IP Reputation" status="Learning" variant="warning" />
                <ModuleRow label="Rate Limiter" status="Active" variant="success" />
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="h-3.5 w-3.5 text-warning-500/70" />
                  Chaos Experiments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ModuleRow label="Latency Injection" status="Idle" variant="neutral" />
                <ModuleRow label="Pod Kill" status="Running" variant="danger" dot />
                <ModuleRow label="DNS Chaos" status="Idle" variant="neutral" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right: Logs + Actions (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Live Logs */}
          <div className="opacity-0 animate-terminal-in stagger-4">
            <Card variant="default" className="bg-neutral-950/90 border-neutral-800/40">
              <CardHeader>
                <CardTitle className="text-sm">System Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0 font-mono text-[10px] leading-relaxed">
                  {MOCK_LOGS.map((log) => (
                    <div key={log.id} className="flex gap-2 py-1.5 border-b border-neutral-900/60 last:border-0">
                      <span className="text-neutral-700 flex-shrink-0">{log.time}</span>
                      <span className={
                        log.level === 'ERR' ? 'text-danger-500 font-semibold flex-shrink-0' :
                        log.level === 'WARN' ? 'text-warning-500/80 flex-shrink-0' :
                        'text-neutral-600 flex-shrink-0'
                      }>{log.level.padEnd(4)}</span>
                      <span className="text-neutral-500 truncate">{log.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="opacity-0 animate-terminal-in stagger-6">
            <Card variant="outline">
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" className="w-full">Flush Cache</Button>
                <Button variant="secondary" size="sm" className="w-full">Rotate Keys</Button>
                <Button variant="danger" size="sm" className="w-full col-span-2">
                  Emergency Shutdown
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModuleRow({ label, status, variant, dot }: {
  label: string;
  status: string;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
  dot?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-1.5 px-2.5 bg-neutral-800/20 rounded-[2px] border border-neutral-800/30">
      <span className="text-xs font-sans text-neutral-400">{label}</span>
      <Badge variant={variant} size="sm" dot={dot}>{status}</Badge>
    </div>
  );
}
