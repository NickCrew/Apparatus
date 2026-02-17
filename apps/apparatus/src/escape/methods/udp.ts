import dgram from "dgram";

export async function checkUDP(host: string, port: number, data: string = "ping"): Promise<any> {
    const results: any = {
        name: `udp_${port}`,
        target: `${host}:${port}`,
        checks: []
    };

    return new Promise((resolve) => {
        const socket = dgram.createSocket("udp4");
        const message = Buffer.from(data);
        const start = Date.now();

        socket.send(message, port, host, (err) => {
            if (err) {
                results.status = "failed";
                results.error = err.message;
            } else {
                results.status = "success";
                results.duration = Date.now() - start;
                results.details = "Packet sent (UDP is connectionless)";
            }
            socket.close();
            resolve(results);
        });
    });
}
