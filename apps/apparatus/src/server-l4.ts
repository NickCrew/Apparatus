import net from "net";
import dgram from "dgram";
import { logger } from "./logger.js";
import { cfg } from "./config.js";

export function startL4Servers() {
    // TCP Echo Server
    const tcpServer = net.createServer((socket) => {
        logger.info({ remoteAddress: socket.remoteAddress, protocol: "tcp" }, "TCP connection established");
        socket.pipe(socket); // Echo back everything
        socket.on("error", (err) => logger.error({ err, protocol: "tcp" }, "TCP socket error"));
    });

    tcpServer.listen(cfg.portTcp, cfg.host, () => {
        logger.info({ port: cfg.portTcp, protocol: "tcp" }, "TCP Echo server listening");
    });

    // UDP Echo Server
    const udpServer = dgram.createSocket("udp4");

    udpServer.on("message", (msg, rinfo) => {
        logger.debug({ remoteAddress: rinfo.address, protocol: "udp" }, "UDP packet received");
        udpServer.send(msg, rinfo.port, rinfo.address, (err) => {
            if (err) logger.error({ err, protocol: "udp" }, "UDP send error");
        });
    });

    udpServer.on("listening", () => {
        const address = udpServer.address();
        logger.info({ port: address.port, protocol: "udp" }, "UDP Echo server listening");
    });

    udpServer.bind(cfg.portUdp, cfg.host);
}
