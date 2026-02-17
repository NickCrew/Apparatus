import client from "prom-client";

// Create a Registry
export const register = new client.Registry();

// Add default metrics (cpu, memory, event loop lag, etc.)
client.collectDefaultMetrics({ register, prefix: "echo_" });

// Define custom metrics
export const httpRequestDurationMicroseconds = new client.Histogram({
    name: "echo_http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5], // 10ms to 5s
    registers: [register],
});

export const httpRequestsTotal = new client.Counter({
    name: "echo_http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
    registers: [register],
});

