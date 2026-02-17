import WebSocket from "ws";

export async function checkWebSocket(url: string, data?: string): Promise<any> {
    const results: any = {
        name: "websocket_connect",
        target: url,
        checks: []
    };

    return new Promise((resolve) => {
        const start = Date.now();
        const ws = new WebSocket(url);
        
        const timeout = setTimeout(() => {
            ws.terminate();
            results.status = "failed";
            results.error = "Timeout";
            resolve(results);
        }, 3000);

        ws.on("open", () => {
            clearTimeout(timeout);
            results.status = "success";
            results.duration = Date.now() - start;
            results.details = "Connected";
            
            if (data) {
                ws.send(data);
                results.details += " + Data Sent";
            }
            
            ws.close();
            resolve(results);
        });

        ws.on("error", (err: any) => {
            clearTimeout(timeout);
            results.status = "failed";
            results.error = err.message;
            resolve(results);
        });
    });
}
