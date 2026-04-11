import { describe, it, expect, mock, beforeAll, afterAll } from "bun:test";
import app from "..";

/** * ---------------------------------------------------------------------------
 * SERVER SETUP
 * ---------------------------------------------------------------------------
 * We start a real server instance so we can use the native fetch API 
 * instead of app.fetch (Internal Hono mock).
 */

let server: any;
const TEST_PORT = 3001;
const BASE_URL = `http://localhost:${TEST_PORT}`;

beforeAll(() => {
    server = Bun.serve({
        port: TEST_PORT,
        fetch: app.fetch,
    });
});

afterAll(() => {
    server.stop();
});

/** * ---------------------------------------------------------------------------
 * MOCKING DEPENDENCIES
 * ---------------------------------------------------------------------------
 */

// Mock Prisma database client
mock.module("./infrastructure/database/prisma", () => ({
    default: {
        $queryRaw: mock(() => Promise.resolve([{ 1: 1 }])),
    },
}));

// Mock User Read repository
mock.module("./user/user.read", () => ({
    default: class MockUserRead {
        login = mock(async (body: any) => {
            if (body?.email === "valid@test.com" && body?.password === "secret") {
                return {
                    user: { id: "user-1", email: "valid@test.com", role: "USER" },
                    token: "mock-refresh-token",
                };
            }
            const err: any = new Error("Invalid credentials");
            err.status = 401;
            err.error = "INVALID_CREDENTIALS";
            throw err;
        });

        refresh = mock(async (token: string) => {
            if (token === "mock-refresh-token") {
                return { id: "user-1", email: "valid@test.com", role: "USER" };
            }
            const err: any = new Error("Invalid refresh token");
            err.status = 401;
            err.error = "INVALID_TOKEN";
            throw err;
        });
    },
}));

// Mock User Write repository
mock.module("./user/user.write", () => ({
    default: class MockUserWrite {
        register = mock(async (body: any) => {
            if (!body?.email || !body?.password) {
                const err: any = new Error("Validation failed");
                err.status = 400;
                err.error = "VALIDATION_ERROR";
                throw err;
            }
            return { id: "new-user-1", email: body.email };
        });
        verify = mock(async (_userId: string) => undefined);
        uploadPhotoProfile = mock(async (_payload: any) => "https://cdn.example.com/photo.jpg");
        editPhotoProfile = mock(async (_payload: any) => "https://cdn.example.com/photo-edited.jpg");
        deletePhotoProfile = mock(async (_userId: string) => null);
    },
}));

// Mock Email Read service
mock.module("./email/email.read.", () => ({
    default: class MockEmailRead {
        verify = mock(async (body: any) => {
            if (body?.code === "123456") return "new-user-1";
            const err: any = new Error("Invalid verification code");
            err.status = 400;
            err.error = "INVALID_CODE";
            throw err;
        });
    },
}));

// Mock Email Write service
mock.module("./email/email.write", () => ({
    default: class MockEmailWrite {
        create = mock(async (_userId: string, _email: string) => undefined);
    },
}));

// Mock Auth Utilities
mock.module("./utils/auth/auth", () => ({
    buildAccessToken: mock((_user: any) => "mock-access-token"),
    verifyJwt: mock(async (header: string) => {
        if (!header.startsWith("Bearer valid-")) {
            const err: any = new Error("Invalid token");
            err.status = 401;
            throw err;
        }
        return { id: "user-1", email: "valid@test.com" };
    }),
}));

// Mock Environment Config
mock.module("./config", () => ({
    env: {
        FRONT_URL: "http://localhost:3000",
        JWT_SECRET: "test-secret",
    },
}));

/** * ---------------------------------------------------------------------------
 * REQUEST HELPER
 * ---------------------------------------------------------------------------
 */

async function req(
    method: string,
    path: string,
    opts: {
        body?: Record<string, any>;
        headers?: Record<string, string>;
        cookies?: Record<string, string>;
    } = {},
) {
    const url = `${BASE_URL}${path}`;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Origin": "http://localhost:3000",
        ...(opts.headers ?? {}),
    };

    if (opts.cookies) {
        headers["Cookie"] = Object.entries(opts.cookies)
            .map(([k, v]) => `${k}=${v}`)
            .join("; ");
    }

    const init: RequestInit = { method, headers };
    if (opts.body) init.body = JSON.stringify(opts.body);

    return fetch(url, init);
}

/** * ---------------------------------------------------------------------------
 * TEST SUITES
 * ---------------------------------------------------------------------------
 */

describe("Auth Service Integration Tests", () => {

    // Test health and root routes
    describe("Public Routes", () => {
        it("GET /auth - returns service status", async () => {
            const res = await req("GET", "/auth/");
            expect(res.status).toBe(200);
            expect(await res.text()).toContain("Auth service is running");
        });

        it("GET /auth/health - returns 200 on DB success", async () => {
            const res = await fetch(`${BASE_URL}/auth/health`);
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.message).toBe("Server healthy");
        });
    });

    // Test login functionality
    describe("POST /auth/login", () => {
        it("returns 200 and access_token for valid login", async () => {
            const res = await req("POST", "/auth/login", {
                body: { email: "valid@test.com", password: "secret" },
            });
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.access_token).toBe("mock-access-token");
        });

        it("sets HttpOnly refresh token cookie", async () => {
            const res = await req("POST", "/auth/login", {
                body: { email: "valid@test.com", password: "secret" },
            });
            const setCookie = res.headers.get("set-cookie") ?? "";
            expect(setCookie).toContain("refresh-token=");
            expect(setCookie.toLowerCase()).toContain("httponly");
        });

        it("returns 401 for invalid credentials", async () => {
            const res = await req("POST", "/auth/login", {
                body: { email: "wrong@test.com", password: "bad" },
            });
            expect(res.status).toBe(401);
        });
    });

    // Test token refresh logic
    describe("GET /auth/refresh", () => {
        it("refreshes access token with valid cookie", async () => {
            const res = await req("GET", "/auth/refresh", {
                cookies: { "refresh-token": "mock-refresh-token" },
            });
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.access_token).toBe("mock-access-token");
        });
    });

    // Test user registration and verification
    describe("Registration & Verification", () => {
        it("POST /auth/register - success", async () => {
            const res = await req("POST", "/auth/register", {
                body: { email: "newuser@test.com", password: "StrongPass123!" },
            });
            expect(res.status).toBe(201);
        });

        it("POST /auth/verify - success", async () => {
            const res = await req("POST", "/auth/verify", {
                body: { code: "123456" },
            });
            expect(res.status).toBe(200);
        });
    });

    // Test profile and file uploads using FormData
    describe("Profile Management (Multipart)", () => {
        it("POST /auth/profile - upload photo", async () => {
            const formData = new FormData();
            formData.append("user_id", "user-1");
            formData.append("image", new Blob(["img"], { type: "image/png" }), "avatar.png");

            const res = await fetch(`${BASE_URL}/auth/profile`, {
                method: "POST",
                headers: { Origin: "http://localhost:3000" },
                body: formData,
            });
            expect(res.status).toBe(201);
        });
    });

    // Test security middleware
    describe("Security Guard", () => {
        it("blocks requests without JWT", async () => {
            const res = await req("DELETE", "/auth/logout");
            expect(res.status).toBe(401);
        });
    });

    // Test error handling and 404
    describe("Error Handling", () => {
        it("returns 404 for unknown routes", async () => {
            const res = await req("GET", "/auth/missing");
            const json = await res.json();
            expect(res.status).toBe(404);
            expect(json.status).toBe(404);
        });
    });
});