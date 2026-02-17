import { Activity, Shield, Zap, Globe, Cpu } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { StatCard } from '../ui/StatCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { TrafficVisualizer } from './TrafficVisualizer';

// Mock Data
const MOCK_LOGS = [
  { id: 1, time: '10:42:05', level: 'WARN', module: 'WAF', message: 'Rate limit exceeded for IP 192.168.1.42' },
  { id: 2, time: '10:41:58', level: 'INFO', module: 'AUTH', message: 'New session established: user-admin' },
  { id: 3, time: '10:41:12', level: 'ERR', module: 'CHAOS', message: 'Latency injection failed on service: payment-gateway' },
  { id: 4, time: '10:40:30', level: 'INFO', module: 'NET', message: 'Inbound traffic spike detected on port 443' },
];

export function Overview() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100 tracking-tight font-mono uppercase">System Overview</h1>
          <p className="text-neutral-400 text-sm mt-1">Real-time telemetry and control status.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">Export Report</Button>
          <Button variant="neon" size="sm" leftIcon={<Zap className="h-3 w-3" />}>
            Engage Defense
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Total Traffic" 
          value="2.4 GB/s" 
          trend={{ value: 12, direction: 'up' }}
          icon={Activity}
        />
        <StatCard 
          label="Active Threats" 
          value="42" 
          trend={{ value: 5, direction: 'down' }} // Good down?
          icon={Shield}
          className="border-danger-900/30"
        />
        <StatCard 
          label="System Load" 
          value="78%" 
          trend={{ value: 2, direction: 'up' }}
          icon={Cpu}
        />
        <StatCard 
          label="Uptime" 
          value="99.99%" 
          trend={{ value: 0, direction: 'neutral' }}
          icon={Globe}
        />
      </div>

      {/* Main Dashboard Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Traffic Visualizer */}
          <TrafficVisualizer />

          {/* Active Modules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Card variant="glass">
                <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary-500" />
                      Active Defenses
                   </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                   <div className="flex justify-between items-center p-2 bg-neutral-800/30 rounded-sm border border-neutral-800">
                      <span className="text-xs font-mono text-neutral-300">WAF Ruleset</span>
                      <Badge variant="success" size="sm">Active</Badge>
                   </div>
                   <div className="flex justify-between items-center p-2 bg-neutral-800/30 rounded-sm border border-neutral-800">
                      <span className="text-xs font-mono text-neutral-300">IP Reputation</span>
                      <Badge variant="warning" size="sm">Learning</Badge>
                   </div>
                </CardContent>
             </Card>

             <Card variant="glass">
                <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-warning-500" />
                      Chaos Experiments
                   </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                   <div className="flex justify-between items-center p-2 bg-neutral-800/30 rounded-sm border border-neutral-800">
                      <span className="text-xs font-mono text-neutral-300">Latency Injection</span>
                      <Badge variant="neutral" size="sm">Idle</Badge>
                   </div>
                   <div className="flex justify-between items-center p-2 bg-neutral-800/30 rounded-sm border border-neutral-800">
                      <span className="text-xs font-mono text-neutral-300">Pod Kill</span>
                      <Badge variant="danger" size="sm" dot>Running</Badge>
                   </div>
                </CardContent>
             </Card>
          </div>
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          {/* Live Logs */}
          <Card variant="default" className="bg-black border-neutral-800 h-full">
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-mono text-[10px] leading-tight">
                {MOCK_LOGS.map((log) => (
                  <div key={log.id} className="flex gap-2 border-b border-neutral-900 pb-2 last:border-0 last:pb-0">
                    <span className="text-neutral-500">{log.time}</span>
                    <span className={
                      log.level === 'ERR' ? 'text-danger-500 font-bold' :
                      log.level === 'WARN' ? 'text-warning-500' :
                      'text-info-500'
                    }>{log.level}</span>
                    <span className="text-neutral-300 truncate">{log.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <Card variant="outline">
             <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
             </CardHeader>
             <CardContent className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" className="w-full">Flush Cache</Button>
                <Button variant="secondary" size="sm" className="w-full">Rotate Keys</Button>
                <Button variant="danger" size="sm" className="w-full col-span-2">Emergency Shutdown</Button>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}