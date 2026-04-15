import pino from "pino";
import path from "path";
import fs from "fs";

const logDir = path.join(process.cwd(), "logs");

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir , {recursive: true});
}

const transport = pino.transport({
    targets: [
        {
            target: "pino-roll",
            options: { 
                file: path.join(logDir, "access.log"),
                level: "info",
                interval: "1d",
                size: "10m",
                compress: true,
                mkdir: true,
                count: 7
            }
        },
        {
            target: "pino-roll",
            options: { 
                file: path.join(logDir, "error.log"),
                level: "error",
                interval: "1d",
                size: "10m",
                compress: true,
                mkdir: true,
                count: 7
            }
        },
        {
            target: "pino-pretty",
            options: {
                colorize: true,
            },
            level: "info"
        }
    ]
})

const baseLogger = pino({
    level: "info",
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
        service: "product",
        runtime: "bun"
    }
}, transport)

export const logger = {
    info(data: any, message?: string) {
        baseLogger.info(data, message);
    },
    error(data: any, message?: string) {
        baseLogger.error(data, message);
    },
};