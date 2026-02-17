import { useEffect, useRef } from 'react';
import { useTrafficStream, TrafficEvent } from '../../hooks/useTrafficStream';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Activity } from 'lucide-react';

export function TrafficVisualizer() {
  const { events, isConnected } = useTrafficStream(100);

  return (
    <Card variant="panel" className="h-96 flex flex-col">
      <CardHeader className="flex-none border-b border-neutral-800 pb-2 mb-0 bg-neutral-900/50">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary-500" />
            Live Traffic Feed
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? 'success' : 'neutral'} dot>
              {isConnected ? 'LIVE STREAM' : 'OFFLINE'}
            </Badge>
            <div className="text-xs font-mono text-neutral-500">
               {events.length} EPS
            </div>
          </div>
        </div>
      </CardHeader>
      
      <div className="flex-1 relative overflow-hidden bg-neutral-950 font-mono text-[10px]">
         {/* Canvas Layer for Sparklines/Visuals */}
         <CanvasWaterfall events={events} />
      </div>
    </Card>
  );
}

function CanvasWaterfall({ events }: { events: TrafficEvent[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const eventsRef = useRef(events); // Keep track of latest events without triggering re-renders of the loop

    useEffect(() => {
        eventsRef.current = events;
    }, [events]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrame: number;

        const render = () => {
            if (document.hidden) {
                animationFrame = requestAnimationFrame(render);
                return;
            }

            const width = canvas.width;
            const height = canvas.height;
            
            // Clear
            ctx.clearRect(0, 0, width, height);
            
            // Draw grid
            ctx.strokeStyle = '#1F2633';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < width; i += 40) {
                ctx.moveTo(i, 0);
                ctx.lineTo(i, height);
            }
            ctx.stroke();

            const now = Date.now();
            const timeWindow = 10000; // 10 seconds view
            
            eventsRef.current.forEach(ev => {
                const eventTime = new Date(ev.timestamp).getTime();
                const age = now - eventTime;
                
                if (age > timeWindow) return; // Too old
                
                const x = width - ((age / timeWindow) * width);
                
                // Y position determined by latency
                // Cap latency at 1000ms for height
                const y = height - Math.min((ev.latencyMs / 500) * height, height - 10);
                
                // Color by status
                let color = '#00FF94';
                if (ev.status >= 500) color = '#FF0055';
                else if (ev.status >= 400) color = '#FFB800';
                else if (ev.status >= 300) color = '#00A3FF';

                // Draw "Packet"
                ctx.fillStyle = color;
                ctx.shadowColor = color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Draw Path Label if it's "fresh" (last 1 sec)
                if (age < 2000) {
                    ctx.fillStyle = '#708099';
                    ctx.font = '10px JetBrains Mono';
                    ctx.fillText(`${ev.method} ${ev.path}`, x + 5, y);
                }
            });

            animationFrame = requestAnimationFrame(render);
        };
        
        // Handle Resize
        const resize = () => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
            }
        };
        window.addEventListener('resize', resize);
        resize();

        render();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrame);
        };
    }, []);

    return <canvas 
        ref={canvasRef} 
        className="w-full h-full block" 
        role="img" 
        aria-label={`Live traffic visualization showing ${events.length} recent events`}
    />;
}