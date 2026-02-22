import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Server, ShieldCheck, Activity } from 'lucide-react';
import { useApparatus } from '../../providers/ApparatusProvider';
import { cn } from '../ui/cn';

interface ProtocolServer {
  name: string;
  protocol: string;
  port: number;
  status: 'active' | 'disabled' | 'error';
  path?: string;
}

export function ProtocolGrid({ glow, variant = "panel" }: { glow?: any, variant?: any }) {
  const { baseUrl } = useApparatus();
  const [servers, setServers] = useState<ProtocolServer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${baseUrl}/api/infra/status`)
      .then(res => res.json())
      .then(data => {
        setServers(data.servers);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch infra status:', err);
        setLoading(false);
      });
  }, [baseUrl]);

  if (loading) {
    return (
      <Card variant={variant} glow={glow} className="animate-pulse">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] font-mono tracking-widest text-neutral-500">
            Scanning Infrastructure...
          </CardTitle>
        </CardHeader>
        <CardContent className="h-48" />
      </Card>
    );
  }

  return (
    <Card variant={variant} glow={glow} className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-white/5 bg-white/[0.02]">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-[11px] font-mono tracking-widest">
            <Server className="h-3.5 w-3.5 text-primary/70" />
            Protocol Surface Area
          </CardTitle>
          <Badge variant="neutral" size="sm">{servers.length} Listeners</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5">
          {servers.map((server) => (
            <div 
              key={server.name} 
              className="bg-neutral-900/50 p-3 flex items-center justify-between hover:bg-white/[0.03] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-500",
                  server.status === 'active' ? "bg-primary shadow-[0_0_8px_rgba(0,240,255,0.5)]" : "bg-neutral-700"
                )} />
                <div>
                  <div className="text-[11px] font-bold text-neutral-200 tracking-tight group-hover:text-primary transition-colors">
                    {server.name}
                  </div>
                  <div className="text-[9px] font-mono text-neutral-500 flex items-center gap-1.5 mt-0.5">
                    <span className="text-neutral-600">{server.protocol}</span>
                    <span className="w-1 h-1 rounded-full bg-neutral-800" />
                    <span className="text-primary/60 font-bold">Port {server.port}</span>
                    {server.path && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-neutral-800" />
                        <span className="text-neutral-600">{server.path}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {server.status === 'active' ? (
                  <ShieldCheck className="h-3 w-3 text-primary/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <Activity className="h-3 w-3 text-neutral-700" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <div className="p-2 border-t border-white/5 bg-black/40">
        <div className="text-[9px] font-mono text-neutral-600 text-center tracking-tighter">
          Infrastructure state is immutable for this session.
        </div>
      </div>
    </Card>
  );
}
