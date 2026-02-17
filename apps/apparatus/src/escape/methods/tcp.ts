import net from "net";

export async function checkTCP(host: string, port: number, data?: string): Promise<any> {
    const results: any = {
        name: `tcp_${port}`,
        target: `${host}:${port}`,
        checks: []
    };

    return new Promise((resolve) => {
        const start = Date.now();
        const socket = new net.Socket();
        
        // Timeout after 3 seconds
        socket.setTimeout(3000);

        socket.on("connect", () => {
            if (data) {
                socket.write(data);
            }
            results.status = "success";
            results.duration = Date.now() - start;
            results.details = "Connected";
            socket.destroy();
            resolve(results);
        });

        socket.on("timeout", () => {
            results.status = "failed";
            results.error = "Timeout";
            socket.destroy();
            resolve(results);
        });

        socket.on("error", (err: any) => {
            results.status = "failed";
            results.error = err.message;
            socket.destroy();
            resolve(results);
        });

        socket.connect(port, host);
    });
}
