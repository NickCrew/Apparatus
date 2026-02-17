import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";
import { cfg } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.join(__dirname, "../proto/echo.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const echoProto = grpc.loadPackageDefinition(packageDefinition).echo as any;

function unaryEcho(call: any, callback: any) {
    logger.info({ method: "UnaryEcho", msg: call.request.message }, "gRPC Request");
    callback(null, { message: call.request.message, timestamp: new Date().toISOString() });
}

function serverStreamingEcho(call: any) {
    logger.info({ method: "ServerStreamingEcho", msg: call.request.message }, "gRPC Request");
    for (let i = 0; i < 5; i++) {
        call.write({ message: `${call.request.message} [${i}]`, timestamp: new Date().toISOString() });
    }
    call.end();
}

function clientStreamingEcho(call: any, callback: any) {
    let lastMessage = "";
    call.on("data", (request: any) => {
        logger.info({ method: "ClientStreamingEcho", msg: request.message }, "gRPC Stream Data");
        lastMessage = request.message;
    });
    call.on("end", () => {
        callback(null, { message: `Last: ${lastMessage}`, timestamp: new Date().toISOString() });
    });
}

function bidirectionalStreamingEcho(call: any) {
    call.on("data", (request: any) => {
        logger.info({ method: "BidirectionalStreamingEcho", msg: request.message }, "gRPC Stream Data");
        call.write({ message: `Echo: ${request.message}`, timestamp: new Date().toISOString() });
    });
    call.on("end", () => {
        call.end();
    });
}

export function startGrpcServer() {
    const server = new grpc.Server();
    server.addService(echoProto.EchoService.service, {
        UnaryEcho: unaryEcho,
        ServerStreamingEcho: serverStreamingEcho,
        ClientStreamingEcho: clientStreamingEcho,
        BidirectionalStreamingEcho: bidirectionalStreamingEcho,
    });

    const bindAddr = `${cfg.host}:${cfg.portGrpc}`;
    server.bindAsync(bindAddr, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            logger.error({ err }, "Failed to bind gRPC server");
            return;
        }
        logger.info({ port }, "gRPC server listening");
        // server.start(); // Not needed in newer grpc-js versions, it starts automatically or lacks this method
    });
}
