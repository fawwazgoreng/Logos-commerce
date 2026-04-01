import { Context, Hono } from "hono";
import { ContentfulStatusCode, StatusCode } from "hono/utils/http-status";
import { setCookie, deleteCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { some } from "hono/combine";
import { rateLimiter } from "hono-rate-limiter";
import { getConnInfo } from "hono/bun";
import { prettyJSON } from "hono/pretty-json";
import { HTTPException } from "hono/http-exception";

import prisma from "./infrastructure/database/prisma";
import UserRead from "./user/user.read";
import { createPhotoProfile, userToken } from "./type/userTypes";
import UserWrite from "./user/user.write";
import { signedJwt, verifyJwt } from "./utils/jwtToken";
import { env } from "./config";
import EmailRead from "./email/email.read.";
import { sendEmail } from "./utils/emailHelper";
import EmailWrite from "./email/email.write";

const app = new Hono();
const userRead = new UserRead();
const userWrite = new UserWrite();
const emailRead = new EmailRead();
const emailWrite = new EmailWrite();
const auth = app.basePath("/auth");

/** Token Life Cycles */
const ACCESS_TOKEN_TTL_MS = 1000 * 60 * 15;
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

/** Standardizes error objects for consistent API responses using HTTPException */
const buildAppError = (error: any): HTTPException => {
    const status = (error?.status || 500) as StatusCode;
    const body = JSON.stringify({
        status,
        message: error?.message || "Internal server error",
        error:   error?.error   ?? null,
    });

    return new HTTPException(status as ContentfulStatusCode, {
        message: error?.message || "Internal server error",
        res: new Response(body, {
            status,
            headers: { "Content-Type": "application/json" },
        }),
    });
};

/** Creates a signed Access Token (JWT) with user payload */
const buildAccessToken = (user: any) => {
    const payload: userToken = {
        ...user,
        expired: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
    };
    return signedJwt(payload);
};

// --- Global Middlewares ---

app.use("*", prettyJSON());

/** Security: CSRF and CORS configuration */
app.use(
    "*",
    some(
        csrf({ origin: env.FRONT_URL }),
        cors({
            origin: env.FRONT_URL,
            allowHeaders: ["Content-Type", "Authorization", "x-forwarded-for"],
            allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
            credentials: true,
            maxAge: 600,
        }),
    ),
);

/** Traffic Control: Rate limiting based on IP Address */
app.use(
    rateLimiter({
        windowMs: 15 * 60 * 1000,
        limit: 100,
        keyGenerator: (c: Context): string | Promise<string> =>
            c.req.header("x-forwarded-for") ??
            c.req.header("cf-connecting-ip") ??
            getConnInfo(c).remote.address ??
            "anonymous",
    }),
);

// --- Public Routes ---

/** Basic service availability check */
auth.get("/", (c) => c.text("Auth service is running"));

/** System health check (Database connectivity verification) */
auth.get("/health", async (c) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return c.json({ status: 200, message: "Server healthy" });
    } catch (error: any) {
        throw buildAppError({
            status: 503,
            message: "Database connection failed",
            error: error?.message ?? null,
        });
    }
});

/** Handles user authentication and sets Refresh Token cookie */
auth.post("/login", async (c) => {
    try {
        const body = await c.req.json();
        const { user, token: refreshToken } = await userRead.login(body);
        const access_token = buildAccessToken(user);

        setCookie(c, "refresh-token", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "Strict",
            path: "/",
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

auth.post("/register", async (c) => {
    try {
        const request = await c.req.json();
        const user = await userWrite.register(request);
        await emailWrite.create(user.id , user.email);
        c.status(201);
        return c.json({
            status: 201,
            message: "success create user, please verify your account",
            user
        });
    } catch (error: any) {
        throw buildAppError(error);
    }
});

auth.post("/verify", async (c) => {
    try {
        const request = await c.req.json();
        const userId = await emailRead.verify(request);
        await userWrite.verify(String(userId));
        c.status(200);
        return c.json({
            status: 200,
            message: "success verify email account"
        })
    } catch (error : any) {
        throw buildAppError(error);
    } 
})

auth.post("/profile", async (c) => {
    try {
        const request = await c.req.parseBody({ all: true });
        const payload: createPhotoProfile= {
            user_id: String(request["user_id"] || ""),
            image: request["image"] as File
        };
        const photoProfile = await userWrite.uploadPhotoProfile(payload);
        c.status(201);
        return c.json({
            status: 201,
            message: "success add profile",
            url: photoProfile
        })
    } catch (error) {
        throw buildAppError(error);
    }
}).put("/profile", async (c) => {
    try {
        const request = await c.req.parseBody({ all: true });
        const payload: createPhotoProfile= {
            user_id: String(request["user_id"] || ""),
            image: request["image"] as File
        };
        const photoProfile = await userWrite.editPhotoProfile(payload);
        c.status(200);
        return c.json({
            status: 201,
            message: "success edit profile",
            url: photoProfile
        })
    } catch (error) {
        throw buildAppError(error);
    }
}).delete("/profile", async (c) => {
    try {
        const request = await c.req.parseBody({ all: true });
        const user_id = String(request["user_id"] || "");
        const photoProfile = await userWrite.deletePhotoProfile(user_id);
        c.status(200);
        return c.json({
            status: 201,
            message: "success delete profile",
            url: photoProfile
        })
    } catch (error) {
        throw buildAppError(error);
    }
})

// --- Auth Middleware ---

/** Intercepts requests to verify JWT presence and validity */
auth.use("*", async (c, next) => {
    try {
        const authHeader = c.req.header("Authorization");
        await verifyJwt(authHeader);
        await next();
    } catch (error: any) {
        throw buildAppError({
            status:  error?.status  || 401,
            message: error?.message || "Unauthorized",
            error:   error?.error   ?? null,
        });
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

// --- Global Error Handler ---

/** Centralized error handler — catches all thrown exceptions */
app.onError(async (error: any, c) => {
    const status = (
        error instanceof HTTPException ? error.status : (error?.status || 500)
    ) as StatusCode;

    /** Ensure CORS headers are present even in error responses */
    c.res.headers.set("Access-Control-Allow-Origin", env.FRONT_URL ?? "https://localhost:3000");
    c.res.headers.set("Access-Control-Allow-Credentials", "true");

    c.status(status);

    /** Extract JSON body from HTTPException (via buildAppError) or fallback to generic */
    if (error instanceof HTTPException) {
        const res = error.getResponse();
        const body = await res.clone().json().catch(() => ({
            status,
            message: error.message || "Internal server error",
            error: null,
        }));
        return c.json(body);
    }

    /** Fallback response for errors that bypassed buildAppError */
    return c.json({
        status,
        message: error?.message || "Internal server error",
        error:   error?.error   || (status === 500 ? "Check server logs" : null),
    });
});

/** Standardized 404 handler for unmatched routes */
app.notFound((c) =>
    c.json({
        status: 404,
        message: `Route not found: ${c.req.method} ${c.req.path}`,
        error: null,
    }, 404)
);

app.route("/", auth);

export default app;