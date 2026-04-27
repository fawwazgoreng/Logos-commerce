import { Hono } from "hono";
import { StatusCode } from "hono/utils/http-status";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { some } from "hono/combine";
import { rateLimiter } from "hono-rate-limiter";
import { getConnInfo, serveStatic } from "hono/bun";
import { prettyJSON } from "hono/pretty-json";
import { HTTPException } from "hono/http-exception";
import { env } from "./config";
import { logger } from "./infrastructure/logger/log";
import { toHttpError } from "./utils/error/function";
import { AppError } from "./utils/error";
import prisma from "./infrastructure/database/prisma";
import productRoute from "./product/product.route";

const app = new Hono();
const product = new Hono(); // Standalone router for product sub-routes

// Apply JSON formatting to all responses
app.use("*", prettyJSON());

// Security: Enable CSRF protection and CORS with specific frontend origin
app.use(
    "*",
    some(
        csrf({ origin: env.FRONT_URL }),
        cors({
            origin: env.FRONT_URL,
            allowHeaders: ["Content-Type", "productorization", "x-forwarded-for"],
            allowMethods: ["GET", "POST", "DELETE", "OPTIONS", "PUT"],
            credentials: true,
            maxAge: 600,
        }),
    ),
);

// Traffic Control: Prevent abuse by limiting requests per IP address
app.use(
    rateLimiter({
        windowMs: 15 * 60 * 1000,
        limit: 100,
        keyGenerator: async (c): Promise<string> =>
            c.req.header("x-forwarded-for") ??
            c.req.header("cf-connecting-ip") ??
            getConnInfo(c).remote.address ??
            "anonymous",
    }),
);

app.use("*", async (c, next) => {
    const log = {
        method: c.req.method,
        path: c.req.path,
        headers: c.req.header,
        body: await c.req.json(),
    };
    logger.info(log);
    await next();
})

// --- Public Routes ---

// Service availability indicator
product.get("/", (c) => c.text("product service is running"));

// Kubernetes health probe endpoint to verify database connectivity
product.get("/health", async (c) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return c.json({ status: 200, message: "Server healthy" });
    } catch {
        throw toHttpError(new AppError("Database connection failed", 503, ""));
    }
});

// Serve static assets from the public directory
product.use(
    "/static/*",
    serveStatic({
        root: "./public",
        rewriteRequestPath: (path) => path.replace(/^\/static/, ""),
    }),
);

product.route("/" , productRoute);

// --- Error & Fallback Handlers ---

// Global error handler to catch exceptions and return standardized JSON responses
app.onError(async (error: any, c) => {
    const status = (error instanceof HTTPException ? error.status : error?.status || 500) as StatusCode;
    c.res.headers.set("Access-Control-Allow-Origin", env.FRONT_URL ?? "http://localhost:3000");
    c.res.headers.set("Access-Control-Allow-Credentials", "true");
    c.status(status);

    if (error instanceof HTTPException) {
        const body = await error.getResponse().clone().json().catch(() => ({ status, message: error.message, error: null }));
        logger.error(body);
        return c.json(body);
    }

    logger.error({ path: c.req.path, method: c.req.method, status, message: error.message });
    return c.json({
        status,
        message: error?.message || "Internal server error",
        error: error?.error || (status === 500 ? "Check server logs" : null),
    });
});

// Fallback for requests targeting non-existent endpoints
app.notFound((c) =>
    c.json({ status: 404, message: `Route not found: ${c.req.method} ${c.req.path}`, error: null }, 404)
);

// Mount the productentication router under the /product prefix
app.route("/product", product);

export default app;