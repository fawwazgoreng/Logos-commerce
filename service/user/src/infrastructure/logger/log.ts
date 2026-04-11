import pino from "pino";
import path from "path";
import fs from "fs";
const logDir = path.join(process.cwd(), "logs");

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const transport = pino.transport({
    targets: [
        {
            target: "pino-roll",
            options: {
                file: path.join(logDir, "warn.log"),
                level: "warn",
                size: "10m",
            },
        },
        {
            target: "pino-roll",
            options: {
                file: path.join(logDir, "error.log"),
                level: "error",
                size: "10m",
            },
        },
        {
            target: "pino-pretty",
            options: {
                colorize: true,
            },
            level: "info",
        },
    ],
    options: { destination: logDir },
});

const baseLogger = pino(
    {
        level: "info",
        timestamp: pino.stdTimeFunctions.isoTime,
        base: {
            service: "api-service",
            runtime: "bun",
        },
    },
    transport,
);

export const logger = {
    info: (data: any) => baseLogger.info(data),
    warn: (data: any) => baseLogger.warn(data),
    error: (data: any) => baseLogger.error(data),
};
