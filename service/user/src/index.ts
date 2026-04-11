import { Hono } from "hono";
import { StatusCode } from "hono/utils/http-status";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { some } from "hono/combine";
import { rateLimiter } from "hono-rate-limiter";
import { getConnInfo, serveStatic } from "hono/bun";
import { prettyJSON } from "hono/pretty-json";
import { HTTPException } from "hono/http-exception";

import prisma from "./infrastructure/database/prisma";
import UserRead from "./user/user.read";
import UserWrite from "./user/user.write";
import EmailRead from "./email/email.read.";
import EmailWrite from "./email/email.write";
import { buildAccessToken, verifyJwt } from "./utils/auth/auth";
import { createPhotoProfile } from "./type/userTypes";
import { env } from "./config";
import { toHttpError } from "./utils/error/separate";
import { AppError } from "./utils/error";
import { logger } from "./infrastructure/logger/log";

// --- Constants ---
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

// --- App & Service Instances ---
const app = new Hono();
const auth = new Hono(); // Standalone router for authentication sub-routes
const userRead = new UserRead();
const userWrite = new UserWrite();
const emailRead = new EmailRead();
const emailWrite = new EmailWrite();

// --- Middleware Definitions ---

// Middleware to verify JWT and guard protected routes
const jwtMiddleware = async (c: any, next: any) => {
    try {
        const authHeader = c.req.header("Authorization");
        if (!authHeader) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
        await verifyJwt(authHeader);
        await next();
    } catch (error: any) {
        throw toHttpError(new AppError(error?.message || "Unauthorized", 401, "UNAUTHORIZED"));
    }
};

// Apply JSON formatting to all responses
app.use("*", prettyJSON());

// Security: Enable CSRF protection and CORS with specific frontend origin
app.use(
    "*",
    some(
        csrf({ origin: env.FRONT_URL }),
        cors({
            origin: env.FRONT_URL,
            allowHeaders: ["Content-Type", "Authorization", "x-forwarded-for"],
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

// --- Public Routes ---

// Service availability indicator
auth.get("/", (c) => c.text("Auth service is running"));

// Kubernetes health probe endpoint to verify database connectivity
auth.get("/health", async (c) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return c.json({ status: 200, message: "Server healthy" });
    } catch {
        throw toHttpError(new AppError("Database connection failed", 503, ""));
    }
});

// Serve static assets from the public directory
auth.use(
    "/static/*",
    serveStatic({
        root: "./public",
        rewriteRequestPath: (path) => path.replace(/^\/static/, ""),
    }),
);

// Process login and issue HTTP-only refresh token via cookies
auth.post("/login", async (c) => {
    try {
        const body = await c.req.json();
        const { user, token: refreshToken } = await userRead.login(body);
        setCookie(c, "refresh-token", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "Strict",
            path: "/",
            expires: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        });
        return c.json({
            status: 200,
            message: "Login successful",
            access_token: buildAccessToken(user),
        });
    } catch (error: any) {
        throw toHttpError(error);
    }
});

// Generate a new access token using a valid refresh token cookie
auth.get("/refresh", async (c) => {
    try {
        const user = await userRead.refresh(String(getCookie(c, "refresh-token")));
        return c.json({
            status: 200,
            message: "Token refreshed successfully",
            access_token: buildAccessToken(user),
        });
    } catch (error: any) {
        throw toHttpError(error);
    }
});

// Register new users and trigger verification email
auth.post("/register", async (c) => {
    try {
        const user = await userWrite.register(await c.req.json());
        await emailWrite.create(user.id, user.email);
        return c.json({ status: 201, message: "Verification code sent, check your email", user }, 201);
    } catch (error: any) {
        throw toHttpError(error);
    }
});

// Validate the verification code and activate user account
auth.post("/verify", async (c) => {
    try {
        const userId = await emailRead.verify(await c.req.json());
        await userWrite.verify(String(userId));
        return c.json({ status: 200, message: "Email verified successfully" });
    } catch (error: any) {
        throw toHttpError(error);
    }
});

// --- Protected Routes (JWT required) ---

// Log out user by clearing the refresh token cookie
auth.delete("/logout", jwtMiddleware, async (c) => {
    deleteCookie(c, "refresh-token");
    return c.json({ status: 200, message: "Logout successful" });
});

// Upload and create a new user profile image
auth.post("/profile", jwtMiddleware, async (c) => {
    try {
        const req = await c.req.parseBody({ all: true });
        const payload: createPhotoProfile = {
            user_id: String(req["user_id"] || ""),
            image: req["image"] as File,
        };
        return c.json({
            status: 201,
            message: "Profile created",
            url: await userWrite.uploadPhotoProfile(payload),
        }, 201);
    } catch (error) {
        throw toHttpError(error);
    }
});

// Update an existing user profile image
auth.put("/profile", jwtMiddleware, async (c) => {
    try {
        const req = await c.req.parseBody({ all: true });
        const payload: createPhotoProfile = {
            user_id: String(req["user_id"] || ""),
            image: req["image"] as File,
        };
        return c.json({
            status: 200,
            message: "Profile updated",
            url: await userWrite.editPhotoProfile(payload),
        });
    } catch (error) {
        throw toHttpError(error);
    }
});

// Remove a user profile image from storage
auth.delete("/profile", jwtMiddleware, async (c) => {
    try {
        const req = await c.req.parseBody({ all: true });
        return c.json({
            status: 200,
            message: "Profile deleted",
            url: await userWrite.deletePhotoProfile(String(req["user_id"] || "")),
        });
    } catch (error) {
        throw toHttpError(error);
    }
});

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

// Mount the authentication router under the /auth prefix
app.route("/auth", auth);

export default app;