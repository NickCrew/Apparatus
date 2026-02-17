import pino from "pino";

export const logger = pino({
    level: process.env.NODE_ENV === "test" ? "silent" : (process.env.LOG_LEVEL || "info"),
    transport: (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") ? {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" }
    } : undefined
});