import { Context, Hono } from "hono";
import { StatusCode } from "hono/utils/http-status";
import prisma from "./infrastructure/database/prisma";
import UserRead from "./user/read";
import { userToken } from "./userTypes";
import { signedJwt } from "./utils/jwtToken";
import { setCookie, deleteCookie } from "hono/cookie";

const app = new Hono();
const userRead = new UserRead();

const auth = app.basePath("/auth");

auth.get("/", (c) => {
    return c.text("Hello Hono!");
});

auth.get("/health", async (c) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return c.json({
            message: "server healthy",
        });
    } catch (error: any) {
        throw {};
    }
});

auth.post("/login", async (c) => {
    try {
        const request = await c.req.json();
        const { res, token } = await userRead.login(request);

        const now = new Date();

        const jwtPayload: userToken = {
            ...res,
            created_at: now,
            expired: new Date(now.getTime() + 1000 * 60 * 15),
        };

        const access_token = signedJwt(jwtPayload);

        const refreshExpired = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

        setCookie(c, "refresh-token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "Strict",
            path: "/",
            expires: refreshExpired,
        });

        c.status(200);
        return c.json({
            status: 200,
            message: "login succesfully",
            access_token,
        });
    } catch (error) {
        throw error;
    }
});

auth.delete("/logout", async (c) => {
    try {
        deleteCookie(c, "refresh-token", {
            path: "/",
        });

        return c.json({
            message: "logout success",
        });
    } catch (error) {
        throw {
            error,
        };
    }
});

app.route("/", auth);

app.onError((error: any, c: Context) => {
    const res = {
        status: error.status || 500,
        message: error.message || "internal server error",
        error: error.error || "internal server error",
    };
    c.status(res.status as StatusCode);
    return c.json(res);
});

export default app;
