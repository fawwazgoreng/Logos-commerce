import { Context, Hono } from "hono";
import { StatusCode } from "hono/utils/http-status";
import { setCookie, deleteCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { some } from "hono/combine";
import { rateLimiter } from "hono-rate-limiter";
import { getConnInfo } from "hono/bun";

import prisma from "./infrastructure/database/prisma";
import UserRead from "./user/read";
import { userToken } from "./userTypes";
import { signedJwt, verifyJwt } from "./utils/jwtToken";
import { env } from "./config";

const app = new Hono();
const userRead = new UserRead();
const auth = app.basePath("/auth");

/** Token Life Cycles */
const ACCESS_TOKEN_TTL_MS = 1000 * 60 * 15; 
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

/** Standardizes error objects for consistent API responses */
const buildAppError = (error: any) => ({
    status: error?.status || 500,
    message: error?.message || "Internal server error",
    error: error?.error ?? null,
});

/** Creates a signed Access Token (JWT) with user payload */
const buildAccessToken = (user: any) => {
    const payload: userToken = {
        ...user,
        expired: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
    };
    return signedJwt(payload);
};

// --- Global Middlewares ---

/** Security: CSRF and CORS configuration */
app.use("*", some(
    csrf({ origin: env.FRONT_URL }),
    cors({
        origin: env.FRONT_URL,
        allowHeaders: ['Content-Type', 'Authorization', 'x-forwarded-for'],
        allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
        credentials: true,
        maxAge: 600,
    })
));

/** Traffic Control: Rate limiting based on IP Address */
app.use(rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    keyGenerator: (c : Context) : string | Promise<string> => 
        c.req.header("x-forwarded-for") ?? 
        c.req.header("cf-connecting-ip") ?? 
        getConnInfo(c).remote.address ?? "anonymous"
}));

// --- Public Routes ---

/** Basic service availability check */
auth.get("/", (c) => c.text("Auth service is running"));

/** System health check (Database connectivity verification) */
auth.get("/health", async (c) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return c.json({ status: 200, message: "Server healthy" });
    } catch (error: any) {
        throw { status: 503, message: "Database connection failed", error: error?.message ?? null };
    }
});

/** Handles user authentication and sets Refresh Token cookie */
auth.post("/login", async (c) => {
    try {
        const body = await c.req.json();
        const { user, token: refreshToken } = await userRead.login(body);
        const access_token = buildAccessToken(user);

        setCookie(c, "refresh-token", refreshToken, {
            httpOnly: true, secure: true, sameSite: "Strict", path: "/",
            expires: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        });

        return c.json({ status: 200, message: "Login successful", access_token });
    } catch (error: any) {
        throw buildAppError(error);
    }
});

/** Issues a new Access Token using a valid Refresh Token */
auth.get("/refresh", async (c) => {
    try {
        const user = await userRead.refresh(c);
        const access_token = buildAccessToken(user);
        return c.json({ status: 200, message: "Token refreshed successfully", access_token });
    } catch (error: any) {
        throw buildAppError(error);
    }
});

// --- Auth Middleware ---

/** Intercepts requests to verify JWT presence and validity */
auth.use("*", async (c, next) => {
    try {
        const authHeader = c.req.header("Authorization");
        await verifyJwt(authHeader);
        await next();
    } catch (error: any) {
        throw { status: error?.status || 401, message: error?.message || "Unauthorized", error: error?.error ?? null };
    }
});

// --- Protected Routes ---

/** Clears authentication session by removing the Refresh Token cookie */
auth.delete("/logout", async (c) => {
    try {
        deleteCookie(c, "refresh-token");
        return c.json({ status: 200, message: "Logout successful" });
    } catch (error: any) {
        throw buildAppError(error);
    }
});

/** Global Error Handler for Hono application */
app.onError((error: any, c: Context) => {
    const res = buildAppError(error);
    c.status(res.status as StatusCode);
    return c.json(res);
});

app.route("/", auth);

export default app;