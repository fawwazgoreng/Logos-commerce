import { Hono } from "hono";
import { setCookie, getCookie } from "hono/cookie";
import { buildAccessToken } from "../utils/auth/auth";
import UserRead from "./user.read";
import EmailRead from "../email/email.read";
import EmailWrite from "../email/email.write";
import { toHttpError } from "../utils/error/separate";
import UserWrite from "./user.write";

const auth = new Hono();

// --- Constants ---
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

// --- App & Service Instances ---
const userRead = new UserRead();
const emailRead = new EmailRead();
const emailWrite = new EmailWrite();
const userWrite = new UserWrite();

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

export default auth;