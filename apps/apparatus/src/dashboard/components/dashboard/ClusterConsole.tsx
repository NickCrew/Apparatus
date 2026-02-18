import { useEffect, useRef, useState, type FormEvent, useMemo } from 'react';
import { Globe, Zap, Wifi, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useCluster, ClusterNode } from '../../hooks/useCluster';
import { cn } from '../ui/cn';

// Simple validator for private IP ranges (RFC 1918) and localhost
const isPrivateIp = (hostname: string) => {
    // Check localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
    
    // Check private ranges (10.x.x.x, 172.16.x.x-172.31.x.x, 192.168.x.x)
    // Simplified regex check
    if (/^10\./.test(hostname)) return true;
    if (/^192\.168\./.test(hostname)) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) return true;
    
    return false;
};

export function ClusterConsole() {
  const { nodes, triggerAttack, isLoading, isAttacking } = useCluster();
  const [target, setTarget] = useState('http://example.com');
  const [rate, setRate] = useState(10);

  // Mock nodes for visualization if we only have 1 (self) in dev
  const displayNodes = useMemo(() => {
      if (nodes.length !== 1) return nodes;
      return [
          ...nodes,
          { ip: '10.0.0.2', role: 'peer', status: 'active', lastSeen: Date.now() },
          { ip: '10.0.0.3', role: 'peer', status: 'active', lastSeen: Date.now() },
          { ip: '10.0.0.4', role: 'peer', status: 'active', lastSeen: Date.now() },
          { ip: '10.0.0.5', role: 'peer', status: 'active', lastSeen: Date.now() },
      ] as ClusterNode[];
  }, [nodes]);

  const handleAttack = (e: FormEvent) => {
      e.preventDefault();
      
      try {
          const url = new URL(target);
          if (isPrivateIp(url.hostname)) {
              alert("Safety Block: Targeting localhost or private IP ranges is restricted in the dashboard.");
              return;
          }
      } catch (e) {
          // Invalid URL, let backend handle or browser validation catch it
      }

      if (!confirm(`Confirm Distributed Load Test?\n\nTarget: ${target}\nRate: ${rate} req/s/node\n\nEnsure authorization before proceeding.`)) {
          return;
      }
      triggerAttack(target, rate);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100 font-mono uppercase">Cluster Operations</h1>
          <p className="text-neutral-400 text-sm mt-1">Distributed command & control network.</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Active Nodes</span>
                <span className="text-xl font-mono text-primary-400 font-bold">{nodes.length} NODES</span>
            </div>
            <div className="h-8 w-px bg-neutral-800" />
            <div className="flex flex-col items-end">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Status</span>
                <Badge variant={isAttacking ? 'warning' : 'success'} dot>
                    {isAttacking ? 'RUNNING' : 'IDLE'}
                </Badge>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Map */}
        <div className="lg:col-span-2">
           <Card variant="panel" className="h-[500px] flex flex-col">
              <CardHeader className="flex-none border-b border-neutral-800 pb-2 mb-0">
                 <CardTitle className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-info-500" />
                    Network Topology
                 </CardTitle>
              </CardHeader>
              <div className="flex-1 relative bg-neutral-950 overflow-hidden">
                 {/* Hex Grid Background */}
                 <div className="absolute inset-0 opacity-20" style={{
                     backgroundImage: 'radial-gradient(#1f2633 1px, transparent 1px)',
                     backgroundSize: '20px 20px'
                 }} />
                 
                 <ClusterMap nodes={displayNodes} isAttacking={isAttacking} />
              </div>
           </Card>
        </div>

        {/* Control Panel */}
        <div className="space-y-6">
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary-500" />
                        Test Configuration
                    </CardTitle>
                    <CardDescription>Configure distributed load test parameters.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAttack} className="space-y-4">
                        <div>
                            <label htmlFor="target-url" className="text-xs font-mono text-neutral-400 uppercase">Target Endpoint</label>
                            <input 
                                id="target-url"
                                type="url" 
                                value={target}
                                onChange={e => setTarget(e.target.value)}
                                className="w-full mt-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-sm font-mono text-white focus:outline-none focus:border-primary-500 transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="attack-rate" className="text-xs font-mono text-neutral-400 uppercase flex justify-between">
                                <span>Requests Per Node / sec</span>
                                <span className="text-primary-400">{rate} RPS</span>
                            </label>
                            <input 
                                id="attack-rate"
                                type="range" 
                                min="1" max="100" 
                                value={rate}
                                onChange={e => setRate(parseInt(e.target.value, 10))}
                                className="w-full mt-2 accent-primary-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                                aria-label="Requests per node per second"
                                aria-valuetext={`${rate} requests per second`}
                            />
                        </div>
                        
                        <div className="pt-4">
                            <Button 
                                type="submit" 
                                variant={isAttacking ? 'secondary' : 'primary'} 
                                className="w-full h-12 text-sm tracking-widest relative overflow-hidden group"
                                disabled={isLoading || isAttacking}
                            >
                                {isAttacking ? (
                                    <>
                                        <Zap className="h-4 w-4 mr-2 animate-pulse text-warning-500" />
                                        TEST RUNNING...
                                    </>
                                ) : (
                                    <>
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] bg-[position:-100%_0,0_0] bg-no-repeat transition-[background-position_0s] duration-0 group-hover:bg-[position:200%_0,0_0] group-hover:duration-[1500ms]" />
                                        <Zap className="h-4 w-4 mr-2" />
                                        START LOAD TEST
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card variant="panel">
                <CardHeader>
                    <CardTitle className="text-xs uppercase tracking-widest text-neutral-500">Node Status</CardTitle>
                </CardHeader>
                <CardContent className="max-h-48 overflow-y-auto space-y-2 p-0">
                    {displayNodes.map((node, i) => (
                        <div key={node.ip + i} className="flex items-center justify-between p-3 border-b border-neutral-800/50 last:border-0 hover:bg-neutral-900/30">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    node.role === 'self' ? "bg-primary-500 shadow-[0_0_8px_rgba(0,240,255,0.6)]" : "bg-success-500"
                                )} />
                                <div className="flex flex-col">
                                    <span className="text-xs font-mono text-neutral-300">{node.ip}</span>
                                    <span className="text-[10px] text-neutral-500 uppercase">{node.role}</span>
                                </div>
                            </div>
                            <Wifi className={cn("h-3 w-3", isAttacking ? "text-primary-500 animate-pulse" : "text-neutral-600")} />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

// Simple Canvas visualization of the cluster
function ClusterMap({ nodes, isAttacking }: { nodes: ClusterNode[], isAttacking: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const nodesRef = useRef(nodes);
    const isAttackingRef = useRef(isAttacking);

    useEffect(() => {
        nodesRef.current = nodes;
    }, [nodes]);

    useEffect(() => {
        isAttackingRef.current = isAttacking;
    }, [isAttacking]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        
        // Handle Resize
        const resize = () => {
            if (canvas.parentElement) {
                const width = canvas.parentElement.clientWidth;
                const height = canvas.parentElement.clientHeight;
                
                canvas.width = width * dpr;
                canvas.height = height * dpr;
                
                // Reset transform to avoid accumulation
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }
        };
        window.addEventListener('resize', resize);
        resize();

        let animationFrame: number;
        let rotation = 0;

        const render = () => {
            if (document.hidden) {
                animationFrame = requestAnimationFrame(render);
                return;
            }

            if (!canvas.parentElement) return;
            const width = canvas.parentElement.clientWidth;
            const height = canvas.parentElement.clientHeight;
            const centerX = width / 2;
            const centerY = height / 2;

            const currentNodes = nodesRef.current;
            const currentAttacking = isAttackingRef.current;

            ctx.clearRect(0, 0, width, height);

            // Draw Connection Lines
            const radius = Math.min(width, height) / 3;
            const pulse = currentAttacking ? (Math.sin(Date.now() / 100) * 0.5 + 0.5) : 0;
            const linkColor = currentAttacking 
                ? `rgba(0, 240, 255, ${0.2 + pulse * 0.3})` // Blue/Cyan pulse
                : 'rgba(31, 38, 51, 0.5)';

            // Filter out self for ring positioning
            const peers = currentNodes.filter(n => n.role !== 'self');
            
            peers.forEach((node, i) => {
                // Avoid division by zero if there's only 1 peer
                const divisor = peers.length || 1;
                const angle = (i / divisor) * Math.PI * 2 + rotation;
                
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;

                // Line to center
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(x, y);
                ctx.strokeStyle = linkColor;
                ctx.lineWidth = currentAttacking ? 2 : 1;
                ctx.stroke();

                // Draw Node
                ctx.fillStyle = currentAttacking ? '#00A3FF' : '#00B140'; // Active = Info Blue, Idle = Green
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = currentAttacking ? 15 : 5;
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Label
                ctx.fillStyle = '#4D5B70';
                ctx.font = '10px JetBrains Mono';
                ctx.fillText(node.ip, x + 10, y + 3);
            });

            // Draw Center Node (Self)
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = '#FFFFFF';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            if (currentAttacking) {
                ctx.strokeStyle = '#00F0FF';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius + 40, 0, Math.PI * 2);
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            rotation += 0.002;
            animationFrame = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrame);
        };
    }, []); // Only run once on mount

    return <canvas 
        ref={canvasRef} 
        className="w-full h-full block" 
        role="img" 
        aria-label={`Cluster map showing ${nodes.length} nodes. Status: ${isAttacking ? 'ATTACKING' : 'IDLE'}`} 
    />;
}
